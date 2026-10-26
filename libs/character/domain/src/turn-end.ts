import {
  applyDamage,
  degreeOfSuccess,
  DiceExpressionText,
  DieSize,
  parseDiceExpression,
  RollTotal,
  rollDice,
} from '@pioneer/rules/dice';
import type { DamageApplication, RandomSource, RollResult, TermResult } from '@pioneer/rules/dice';
import {
  BadgeReevaluation,
  ConditionEffect,
  ConditionValue,
  Dc,
  DegreeOfSuccess,
  EffectExpiry,
  HitPoints,
} from '@pioneer/rules/sdk';
import type { DamageTarget } from '@pioneer/rules/sdk';

import { lapsingSpells, spellsAfterTurnEnd } from './active-spells';
import { airAfterTurn, isSuffocating, SuffocationChecks, suffocationDamage, suffocationDc } from './breath';
import type { BreathState } from './breath';
import { ConditionDurationKind } from './conditions';
import type { ActiveCondition, PersistentDamage } from './conditions';
import { endEffects } from './effect-ending';
import type { ActiveEffect } from './effects';
import { applyPlayCommand, PlayCommandField } from './play-state';
import type { PlayLimits, PlayState } from './play-state';
import type { RecoveryConditions } from './rest-types';
import {
  airLost,
  conditionEnded,
  conditionLowered,
  effectExpired,
  flatCheck,
  persistentDamage,
  spellEnded,
  suffocationSaved,
} from './turn-events';
import type { SuffocationSave, TurnEvent } from './turn-events';
import { reevaluateBadges } from './turn-start';
import type { Reevaluation, TurnOutcome } from './turn-start';

/** The flat check that ends persistent damage is against DC 15, or DC 10 with assisted recovery (Player Core). */
const FLAT_CHECK_DC = Dc.parse(15);
const ASSISTED_FLAT_CHECK_DC = Dc.parse(10);
const FLAT_CHECK_DIE = DieSize.parse(20);
const ONE_ROUND = 1;
const NO_ATTACKS = 0;
const NO_MODIFIER = 0;
const FIRST_CHECK = 1;
const CHECKS_LIMIT = 99;
const LAST_VALUE = ConditionValue.parse(1);

/** What a turn end reads besides the play state. */
export interface EndTurnInputs {
  readonly limits: PlayLimits;
  /** The character's immunities, weaknesses and resistances, which persistent damage goes through. */
  readonly defences: DamageTarget;
  /** What the end of the turn does to each condition the content says it eases (Frightened is lowered). */
  readonly recovery: RecoveryConditions;
  /** The character's Fortitude modifier, read only for a save against suffocation; none counts as 0. */
  readonly fortitude?: () => RollTotal;
}

/** `outcome` moved on to `play`, with the `events` that led there. */
function then({ events }: TurnOutcome, play: PlayState, more: readonly TurnEvent[]): TurnOutcome {
  return { play, events: [...events, ...more] };
}

/** `result` with every damage it deals of `type`: persistent damage has one type, whatever its formula tags. */
function typed(result: TermResult, type: PersistentDamage['type']): TermResult {
  const tags = { type };
  return 'dice' in result
    ? { ...result, term: { ...result.term, tags } }
    : { ...result, term: { ...result.term, tags } };
}

/** The roll of a persistent damage condition's formula, or none when the formula is not plain dice. */
function rolled({ formula, type }: PersistentDamage, random: RandomSource): RollResult | undefined {
  const parsed = parseDiceExpression(DiceExpressionText.parse(formula));
  if (!parsed.ok) {
    return undefined;
  }
  const roll = rollDice(parsed.expression, random);
  return { ...roll, terms: roll.terms.map((result) => typed(result, type)) };
}

/** `play` without the condition `instance`. */
function without(play: PlayState, { id }: ActiveCondition): PlayState {
  return { ...play, conditions: play.conditions.filter((each) => each.id !== id) };
}

/** What a turn end reads and rolls with. */
interface Turn extends EndTurnInputs {
  readonly random: RandomSource;
}

/**
 * One persistent damage condition at the end of the turn: its dice roll anew and go through the character's defences
 * to Hit Points (temporary first, dying as for any damage), then a flat check ends it on success. A dead character
 * takes nothing, and a formula that can't be rolled here does nothing.
 */
function persistentTurn(outcome: TurnOutcome, condition: ActiveCondition, turn: Turn): TurnOutcome {
  const { persistent } = condition;
  const { limits, defences, random } = turn;
  const roll = persistent === undefined || outcome.play.dead ? undefined : rolled(persistent, random);
  if (persistent === undefined || roll === undefined) {
    return outcome;
  }
  const damage = applyDamage(roll, defences);
  const hurt = applyPlayCommand(outcome.play, { field: PlayCommandField.Damage, damage }, limits);
  const die = random.roll(FLAT_CHECK_DIE);
  const dc = persistent.assisted ? ASSISTED_FLAT_CHECK_DC : FLAT_CHECK_DC;
  const events = [
    persistentDamage(condition, { roll, damage }),
    flatCheck(condition.condition, condition.id, { die, dc }),
  ];
  return die >= dc
    ? then(outcome, without(hurt, condition), [...events, conditionEnded(condition.condition, condition.id)])
    : then(outcome, hurt, events);
}

/** Each persistent damage condition rolls, hurts and is checked for, in the order the character has them. */
function persistentDamages(outcome: TurnOutcome, turn: Turn): TurnOutcome {
  let current = outcome;
  for (const condition of outcome.play.conditions.filter(({ persistent }) => persistent !== undefined)) {
    current = persistentTurn(current, condition, turn);
  }
  return current;
}

/** A condition after the end of the turn: what is kept of it, and the event when it changed. */
interface Eased {
  readonly kept: readonly ActiveCondition[];
  readonly events: readonly TurnEvent[];
}

/** `condition` after the end of the turn eases it: gone if the content removes it or its value is spent, else a point lower. */
function easedCondition(condition: ActiveCondition, recovery: RecoveryConditions): Eased {
  const effect = recovery.get(condition.condition);
  if (effect === undefined) {
    return { kept: [condition], events: [] };
  }
  const value = condition.value ?? LAST_VALUE;
  if (effect === ConditionEffect.Remove || value <= LAST_VALUE) {
    return { kept: [], events: [conditionEnded(condition.condition, condition.id)] };
  }
  const lowered = ConditionValue.parse(value - LAST_VALUE);
  return {
    kept: [{ ...condition, value: lowered }],
    events: [conditionLowered(condition.condition, condition.id, lowered)],
  };
}

/** Frightened and any other condition the content eases at the end of the turn go down a point, or end. */
function conditionsEased(outcome: TurnOutcome, recovery: RecoveryConditions): TurnOutcome {
  const { play } = outcome;
  const eased = play.conditions.map((condition) => easedCondition(condition, recovery));
  const conditions = eased.flatMap(({ kept }) => kept);
  return then(
    outcome,
    { ...play, conditions },
    eased.flatMap(({ events }) => events),
  );
}

/** Whether a condition ends at the end of the turn. */
function endsAtTurnEnd({ duration }: ActiveCondition): boolean {
  return duration.kind === ConditionDurationKind.UntilEndOfTurn;
}

/** Whether an effect ends at this turn end: its expiry is a turn end and it is on its last round, or has no clock. */
function expiresAtTurnEnd({ expiry, remaining }: ActiveEffect): boolean {
  return expiry === EffectExpiry.TurnEnd && (remaining === undefined || remaining <= ONE_ROUND);
}

/** Effects that end at a turn end and are out of rounds, and conditions that end at the end of the turn, are removed. */
function expiring(outcome: TurnOutcome): TurnOutcome {
  const { play } = outcome;
  const gone = play.effects.filter((each) => expiresAtTurnEnd(each));
  const conditions = play.conditions.filter((each) => !endsAtTurnEnd(each));
  const events = [
    ...gone.map(({ effect, id }) => effectExpired(effect, id)),
    ...play.conditions.filter((each) => endsAtTurnEnd(each)).map(({ condition, id }) => conditionEnded(condition, id)),
  ];
  return then(
    outcome,
    {
      ...endEffects(
        play,
        gone.map(({ id }) => id),
      ),
      conditions,
    },
    events,
  );
}

/** A save against suffocation: its roll, and the damage a failure rolls and takes through the defences. */
interface SuffocationRoll {
  readonly save: SuffocationSave;
  readonly damage: DamageApplication | undefined;
}

/** Rolls the `check`th save against suffocation: Fortitude against DC 20, 5 more each time; a failure rolls its damage. */
function suffocationRoll(check: SuffocationChecks, turn: Turn): SuffocationRoll {
  const { defences, random } = turn;
  const die = random.roll(FLAT_CHECK_DIE);
  const total = RollTotal.parse(die + (turn.fortitude?.() ?? NO_MODIFIER));
  const dc = suffocationDc(check);
  const { degree } = degreeOfSuccess({ total, natural: die }, dc);
  const parsed = parseDiceExpression(suffocationDamage(check));
  const damage =
    degree === DegreeOfSuccess.Failure && parsed.ok
      ? applyDamage(rollDice(parsed.expression, random), defences)
      : undefined;
  return { save: { check, die, total, dc, degree, taken: HitPoints.parse(damage?.taken ?? NO_MODIFIER) }, damage };
}

/**
 * A character out of air at the end of its turn makes the Fortitude save against suffocation (Player Core, Aquatic
 * Combat): DC 20, 5 more each time. A failure costs 1d10 Hit Points, a 1d10 more each time; a critical failure kills.
 */
function suffocated(outcome: TurnOutcome, breath: BreathState, turn: Turn): TurnOutcome {
  const check = SuffocationChecks.parse(Math.min(breath.checks + FIRST_CHECK, CHECKS_LIMIT));
  const { save, damage } = suffocationRoll(check, turn);
  const marked = { ...outcome.play, breath: { ...breath, checks: check } };
  const hurt =
    damage === undefined ? marked : applyPlayCommand(marked, { field: PlayCommandField.Damage, damage }, turn.limits);
  const dead = save.degree === DegreeOfSuccess.CriticalFailure;
  return then(outcome, dead ? { ...hurt, dead } : hurt, [suffocationSaved(save)]);
}

/**
 * A character holding its breath loses a round of air at the end of its turn, or two when it attacked this turn. One
 * already out of air makes the save against suffocation instead. A dead character, or one breathing freely, is left.
 */
function breathing(outcome: TurnOutcome, turn: Turn): TurnOutcome {
  const { breath, dead, turn: current } = outcome.play;
  if (breath === undefined || dead) {
    return outcome;
  }
  if (isSuffocating(breath)) {
    return suffocated(outcome, breath, turn);
  }
  const air = airAfterTurn(breath.air, current.attacks > NO_ATTACKS);
  return then(outcome, { ...outcome.play, breath: { ...breath, air } }, [airLost(air)]);
}

/** Sustained spells not sustained this turn end, and the rest must be sustained again next turn. */
function spellsLapsing(outcome: TurnOutcome): TurnOutcome {
  const { play } = outcome;
  const ended = lapsingSpells(play.activeSpells).map(({ spell, id }) => spellEnded(spell, id));
  return then(outcome, { ...play, activeSpells: [...spellsAfterTurnEnd(play.activeSpells)] }, ended);
}

/**
 * End-of-turn bookkeeping, one pure function for the browser and the server. In order: each persistent damage
 * condition rolls its damage through the character's defences and is checked for; frightened (and whatever else the
 * content eases) goes down a point; effects that end at a turn end and are out of rounds, and conditions that end at
 * the end of the turn, are removed; sustained spells not sustained this turn end; formula badges that roll again at turn end do. Dice come from `random`.
 */
export function endTurn(play: PlayState, inputs: EndTurnInputs, random: RandomSource): TurnOutcome {
  const begun: TurnOutcome = { play, events: [] };
  const hurt = persistentDamages(begun, { ...inputs, random });
  const lowered = conditionsEased(hurt, inputs.recovery);
  const settled = spellsLapsing(expiring(lowered));
  const reevaluation: Reevaluation = {
    content: inputs.limits.effects,
    when: BadgeReevaluation.TurnEnd,
    random,
  };
  return reevaluateBadges(breathing(settled, { ...inputs, random }), reevaluation);
}
