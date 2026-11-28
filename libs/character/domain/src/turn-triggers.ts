import { appliesAutomatically, triggeredAbilities } from '@pioneer/rules/engine';
import type { ActionCandidate, TriggerableAbility } from '@pioneer/rules/engine';
import type { PredicateFacts } from '@pioneer/rules/predicate';
import { ActionCost, ContentKind, HitPoints, RuleElementKey, TriggerEventType } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { Uuid } from '@pioneer/shared/kernel';

import { grantedActionCandidates } from './available-actions';
import type { CharacterDocument } from './character-document';
import type { StatisticSources } from './character-statistics';
import { resourceLimits } from './counting-commands';
import { EffectInstanceId } from './effects';
import type { ActiveEffect } from './effects';
import type { PlayLimits, PlayState } from './play-state';
import { applySpendCommand } from './spend-commands';
import { SpendCommandField, SpendId, SpendKind } from './spend-log';
import type { SpendRequest } from './spend-log';
import { TurnEventKind, TurnMessage } from './turn-events';
import type { TurnEvent } from './turn-events';
import type { TurnOutcome } from './turn-start';
import { TurnPhase } from './turn-state';
import type { TurnState } from './turn-state';

const NO_HIT_POINTS = HitPoints.parse(0);

/** The events whose triggered abilities play applies: the ends of the character's own turn. */
const TURN_TRIGGER_EVENTS: ReadonlySet<TriggerEventType> = new Set([
  TriggerEventType.TurnStart,
  TriggerEventType.TurnEnd,
]);

/**
 * A granted action that fires at a turn boundary and puts an effect on the character: what it costs and what the effect
 * does (read as an ability), the effect it applies and the temporary Hit Points that effect gives.
 */
export interface TurnTrigger extends TriggerableAbility {
  /** The effect applied to the character. */
  readonly effect: ContentId;
  /** The temporary Hit Points the effect gives; none when it gives none. */
  readonly tempHp: HitPoints;
}

/**
 * A granted action that fires at a turn boundary, which the player may be asked about: what it costs and does, and
 * whether it applies by itself, which never prompts.
 */
export interface TurnOffer extends TriggerableAbility {
  /** Whether it applies by itself when its event fires, so the player is not asked. */
  readonly byItself: boolean;
}

/** What the turn cycle reads to apply triggered abilities by themselves, and to offer the rest. */
export interface TurnTriggers {
  readonly triggers: ReadonlyArray<TurnTrigger>;
  /** Every granted action that fires at a turn boundary, including those the player is asked about. */
  readonly offers: ReadonlyArray<TurnOffer>;
  /** The roll options that hold for the character, which a trigger's predicate reads. */
  readonly facts: PredicateFacts;
}

function effectEntries(registry: ContentRegistry): ReadonlyMap<ContentId, ContentEntry> {
  return new Map(
    registry.packs
      .flatMap((pack) => pack.otherEntries)
      .filter((entry) => entry.kind === ContentKind.Effect)
      .map((entry) => [entry.id, entry]),
  );
}

/** The temporary Hit Points a set of rules gives: the most of its plain `TempHP` values. */
function tempHpOf(rules: ContentEntry['rules']): HitPoints {
  const amounts = rules.flatMap((rule) => {
    const amount = rule.key === RuleElementKey.TempHP ? HitPoints.safeParse(rule.value) : undefined;

    return amount?.success === true ? [amount.data] : [];
  });

  return HitPoints.parse(Math.max(NO_HIT_POINTS, ...amounts));
}

/** The granted actions that fire at a turn boundary, with what each does, and whether it applies by itself. */
function offersOf(
  candidates: ReadonlyArray<ActionCandidate>,
  effects: ReadonlyMap<ContentId, ContentEntry>,
): ReadonlyArray<TurnOffer> {
  return candidates.flatMap(({ id, action }): Array<TurnOffer> => {
    const event = action.triggerEvent;

    if (event === undefined || !TURN_TRIGGER_EVENTS.has(event.event)) {
      return [];
    }

    const effect = action.selfEffect === undefined ? undefined : effects.get(action.selfEffect);

    const ability: TriggerableAbility = {
      id,
      triggerEvent: event,
      autoApply: action.autoApply,
      cost: action.cost,
      frequency: action.frequency,
      needsChoice: action.effects !== undefined,
      rules: effect?.rules ?? [],
    };

    return [
      {
        ...ability,
        byItself: effect !== undefined && action.requirements === undefined && appliesAutomatically(ability),
      },
    ];
  });
}

/**
 * The character's granted actions that fire at a turn boundary and apply an effect to the user (`selfEffect`). An
 * action that has requirements is left to the player: nothing tests them here.
 */
export function turnTriggers(document: CharacterDocument, sources: StatisticSources): TurnTriggers {
  const { candidates, facts } = grantedActionCandidates(document, sources);
  const effects = effectEntries(sources.registry);

  const offers = offersOf(candidates, effects);

  const triggers = candidates.flatMap(({ id, action }): Array<TurnTrigger> => {
    const effect = action.selfEffect === undefined ? undefined : effects.get(action.selfEffect);
    const event = action.triggerEvent;

    if (
      effect === undefined ||
      event === undefined ||
      action.requirements !== undefined ||
      !TURN_TRIGGER_EVENTS.has(event.event)
    ) {
      return [];
    }

    return [
      {
        id,
        triggerEvent: event,
        autoApply: action.autoApply,
        cost: action.cost,
        frequency: action.frequency,
        needsChoice: action.effects !== undefined,
        rules: effect.rules,
        effect: effect.id,
        tempHp: tempHpOf(effect.rules),
      },
    ];
  });

  return { triggers, offers, facts };
}

/** The triggers that fire on `event` and apply by themselves, leaving out an effect the character already has. */
export function autoTriggers(
  event: TriggerEventType,
  { triggers, facts }: TurnTriggers,
  active: ReadonlyArray<ActiveEffect>,
): ReadonlyArray<TurnTrigger> {
  return triggeredAbilities(event, facts, triggers).filter(
    (trigger) => appliesAutomatically(trigger) && !active.some(({ effect }) => effect === trigger.effect),
  );
}

/** Whether the turn can still pay `cost` after the boundary: a spent reaction cannot, nor can an action off-turn. */
function payable(cost: ActionCost | undefined, turn: TurnState): boolean {
  if (cost === ActionCost.Reaction) {
    return !turn.reactionUsed;
  }

  return cost === undefined || cost === ActionCost.Free || turn.phase !== TurnPhase.OffTurn;
}

/**
 * The actions that fire on `event` and are left to the player: a cost, a frequency, a choice or a drawback, or
 * requirements only they can judge. A reaction is offered only while the reaction is unspent, and off-turn only
 * reactions and free actions are, as nothing else could be paid.
 */
export function promptedAbilities(
  event: TriggerEventType,
  { offers, facts }: TurnTriggers,
  turn: TurnState,
): ReadonlyArray<ContentId> {
  return triggeredAbilities(event, facts, offers)
    .filter(({ byItself, cost }) => !byItself && payable(cost, turn))
    .map(({ id }) => id);
}

/** The free spend that applies `trigger`: it is logged, and taking it back ends the effect and the temporary Hit Points. */
export function triggerSpend(trigger: TurnTrigger, newId: () => Uuid): SpendRequest {
  const tempHp = trigger.tempHp > NO_HIT_POINTS ? { tempHp: trigger.tempHp } : undefined;

  return {
    id: SpendId.parse(newId()),
    action: trigger.id,
    cost: { kind: SpendKind.Free },
    apply: { id: EffectInstanceId.parse(newId()), effect: trigger.effect, ...tempHp },
  };
}

/** `current` with `trigger` applied as a free spend; unchanged when its effect is already on the character or the turn refuses it. */
function applyTrigger(current: TurnOutcome, trigger: TurnTrigger, inputs: TriggerInputs): TurnOutcome {
  const { limits, newId } = inputs;
  const request = triggerSpend(trigger, newId);
  const alreadyOn = current.play.effects.some(({ effect }) => effect === trigger.effect);
  const spendLimits = { ...resourceLimits(limits), ...limits.spend, effects: limits.effects };
  const next = applySpendCommand(current.play, { field: SpendCommandField.SpendAction, ...request }, spendLimits);

  if (alreadyOn || next === current.play || request.apply === undefined) {
    return current;
  }

  const applied = { effect: request.apply.effect, instance: request.apply.id, tempHp: trigger.tempHp };

  const play: PlayState = {
    ...current.play,
    ...next,
    effects: [...next.effects],
    activeSpells: [...next.activeSpells],
    spendLog: [...next.spendLog],
  };

  return { play, events: [...current.events, abilityTriggered(trigger.id, applied)] };
}

/**
 * `outcome` with each ability that fires on `event` and applies by itself put on the character, as a free spend so the
 * log shows it and taking it back ends its effect.
 */
export function withTriggered(outcome: TurnOutcome, event: TriggerEventType, inputs: TriggerInputs): TurnOutcome {
  let current = outcome;

  for (const trigger of autoTriggers(event, inputs.triggered(), outcome.play.effects)) {
    current = applyTrigger(current, trigger, inputs);
  }

  return current;
}

/** `event` fired `abilities`, which the player decides to use: they are offered in one prompt. */
function triggersPrompted(event: TriggerEventType, abilities: ReadonlyArray<ContentId>): TurnEvent {
  return {
    kind: TurnEventKind.TriggerPrompt,
    event,
    abilities: [...abilities],
    message: message(TurnMessage.TriggerPrompt, { count: abilities.length }),
  };
}

/** `outcome` with one prompt for the abilities `event` fired that are left to the player; none when there are none. */
export function withPrompted(outcome: TurnOutcome, event: TriggerEventType, inputs: TriggerInputs): TurnOutcome {
  const abilities = promptedAbilities(event, inputs.triggered(), outcome.play.turn);

  return abilities.length === 0
    ? outcome
    : { ...outcome, events: [...outcome.events, triggersPrompted(event, abilities)] };
}

/** An ability fired at the turn boundary and put `effect` on the character, with `tempHp` temporary Hit Points. */
function abilityTriggered(ability: ContentId, applied: EffectApplied): TurnEvent {
  const { effect, instance, tempHp } = applied;

  return {
    kind: TurnEventKind.TriggeredAbility,
    ability,
    effect,
    instance,
    tempHp,
    message: message(TurnMessage.TriggeredAbility),
  };
}

/** The effect a triggered ability put on the character, as which instance, and the temporary Hit Points it gave. */
interface EffectApplied {
  readonly effect: ContentId;
  readonly instance: EffectInstanceId;
  readonly tempHp: HitPoints;
}

/** What applying triggered abilities reads: the limits, the triggers and a source of new ids. */
export interface TriggerInputs {
  readonly limits: PlayLimits;
  readonly triggered: () => TurnTriggers;
  readonly newId: () => Uuid;
}
