import type { RandomSource } from '@pioneer/rules/dice';
import type { RecoveryInPlay } from '@pioneer/rules/engine';
import { BadgeReevaluation, EffectBadgeType, EffectExpiry, HitPoints } from '@pioneer/rules/sdk';

import { spellsCountedDown } from './active-spells';
import { ConditionDurationKind } from './conditions';
import type { ActiveCondition } from './conditions';
import { EffectRounds, rollBadge } from './effects';
import type { ActiveEffect, EffectContent } from './effects';
import { applyPlayCommand, currentHitPoints, PlayCommandField } from './play-state';
import type { PlayLimits, PlayState } from './play-state';
import { conditionEnded, effectExpired, healedEvent, spellEnded, turnStarted } from './turn-events';
import type { TurnEvent } from './turn-events';

const ONE_ROUND = EffectRounds.parse(1);

/** What a turn boundary reads besides the play state: the limits and effect content, and the recovery the effective set gives. */
export interface TurnInputs {
  readonly limits: PlayLimits;
  /** The character's fast healing and regeneration (`vitalsInPlay`); empty when it has none. */
  readonly recovery: readonly RecoveryInPlay[];
}

/** The play state a turn boundary leaves, and what happened, in order. */
export interface TurnOutcome {
  readonly play: PlayState;
  readonly events: readonly TurnEvent[];
}

/** `outcome` moved on to `play`, with the `events` that led there. */
function then({ events }: TurnOutcome, play: PlayState, more: readonly TurnEvent[]): TurnOutcome {
  return { play, events: [...events, ...more] };
}

/**
 * Each recovery heals its amount, as any healing does: Hit Points back above 0 end dying. A dead character is not
 * healed.
 */
function healing(outcome: TurnOutcome, { recovery, limits }: TurnInputs): TurnOutcome {
  let current = outcome;
  for (const { type, amount } of current.play.dead ? [] : recovery) {
    const { play } = current;
    const before = currentHitPoints(play.hp, limits.hitPoints);
    const healed = applyPlayCommand(play, { field: PlayCommandField.Heal, amount }, limits);
    const gained = HitPoints.parse(currentHitPoints(healed.hp, limits.hitPoints) - before);
    current = then(current, healed, gained > 0 ? [healedEvent(type, gained)] : []);
  }
  return current;
}

/**
 * `effect` one round on, or nothing when it ends here. A timed effect ends when its rounds run out at a turn start,
 * which is how it ends unless its content says otherwise; one with no clock ends at a turn start only if its expiry
 * says so (a turn effect), and an encounter or unlimited effect never does.
 */
function countedDown(effect: ActiveEffect): ActiveEffect | undefined {
  const { remaining, expiry } = effect;
  if (remaining === undefined) {
    return expiry === EffectExpiry.TurnStart ? undefined : effect;
  }
  if (remaining > ONE_ROUND) {
    return { ...effect, remaining: EffectRounds.parse(remaining - ONE_ROUND) };
  }
  // Last round: a turn-start effect is over; a turn-end effect runs to the end of this turn, so it stays for End turn.
  return (effect.expiry ?? EffectExpiry.TurnStart) === EffectExpiry.TurnStart ? undefined : effect;
}

/** Every timed effect counts down a round, including those from other creatures; those whose rounds ran out at a turn start are removed. */
function countdown(outcome: TurnOutcome): TurnOutcome {
  const { play } = outcome;
  const kept = play.effects.flatMap((effect) => {
    const next = countedDown(effect);
    return next === undefined ? [] : [next];
  });
  const expired = play.effects
    .filter(({ id }) => !kept.some((each) => each.id === id))
    .map(({ effect, id }) => effectExpired(effect, id));
  return then(outcome, { ...play, effects: kept }, expired);
}

/** Every active spell counts down a round; those whose rounds ran out are removed. */
function spellsCounting(outcome: TurnOutcome): TurnOutcome {
  const { play } = outcome;
  const { kept, ended } = spellsCountedDown(play.activeSpells);
  return then(
    outcome,
    { ...play, activeSpells: [...kept] },
    ended.map(({ spell, id }) => spellEnded(spell, id)),
  );
}

/** Whether a condition ends at the start of the turn. */
function endsAtTurnStart({ duration }: ActiveCondition): boolean {
  return duration.kind === ConditionDurationKind.UntilStartOfTurn;
}

/** Conditions that end at the start of the turn are removed. */
function conditionsEnding(outcome: TurnOutcome): TurnOutcome {
  const { play } = outcome;
  const ended = play.conditions
    .filter((each) => endsAtTurnStart(each))
    .map(({ condition, id }) => conditionEnded(condition, id));
  return then(outcome, { ...play, conditions: play.conditions.filter((each) => !endsAtTurnStart(each)) }, ended);
}

/** The formula badges that roll again at one point of a turn, and the dice they roll with. */
export interface Reevaluation {
  readonly content: EffectContent;
  readonly when: BadgeReevaluation;
  readonly random: RandomSource;
}

/** `effect` with its formula badge rolled again, when the content has it roll again at `when`. */
function reevaluated(effect: ActiveEffect, { content, when, random }: Reevaluation): ActiveEffect {
  const badge = content.get(effect.effect)?.badge;
  if (badge?.type !== EffectBadgeType.Formula || badge.reevaluate !== when) {
    return effect;
  }
  const rolled = rollBadge(badge.formula, random);
  return rolled === undefined ? effect : { ...effect, badge: rolled };
}

/** Every effect still on the character whose formula badge rolls again at `reevaluation.when` rolls it, in order. */
export function reevaluateBadges(outcome: TurnOutcome, reevaluation: Reevaluation): TurnOutcome {
  const { play } = outcome;
  const effects = play.effects.map((effect) => reevaluated(effect, reevaluation));
  return then(outcome, { ...play, effects }, []);
}

/**
 * Start-of-turn bookkeeping, one pure function for the browser and the server. In order: fast healing and
 * regeneration heal; every timed effect counts down a round and those that ran out at a turn start are removed, as do
 * the active spells that ran out of rounds;
 * conditions ending at the start of the turn are removed; formula badges that roll again at turn start do. Dice come
 * from `random`. An effect that ends at a turn end stays on its last round for the end of turn to remove.
 */
export function startTurn(play: PlayState, inputs: TurnInputs, random: RandomSource): TurnOutcome {
  const begun: TurnOutcome = { play, events: [turnStarted()] };
  const healed = healing(begun, inputs);
  const counted = spellsCounting(countdown(healed));
  const settled = conditionsEnding(counted);
  const reevaluation: Reevaluation = {
    content: inputs.limits.effects,
    when: BadgeReevaluation.TurnStart,
    random,
  };
  return reevaluateBadges(settled, reevaluation);
}
