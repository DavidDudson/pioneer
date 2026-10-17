import { summarisePredicate, Truth } from '@pioneer/rules/predicate';
import { RuleElementKey, SenseAcuity } from '@pioneer/rules/sdk';
import type { SenseElement } from '@pioneer/rules/sdk';

import { battleFormInPlay } from './battle-form';
import { LineStatusKind, OverrideStatusKind, SuppressionReason } from './breakdown';
import type { BreakdownLine, LineStatus, OverrideLine, OverrideStatus } from './breakdown';
import { DefenceStatusKind } from './defences';
import type { AdjustmentLine, DefenceStatus, ImmunityLine } from './defences';
import { EffectChange, EffectStatusKind } from './effect-line';
import type {
  DamageAdjustmentEffect,
  EffectStatus,
  ImmunityEffect,
  ModifierEffect,
  NotSummarisedEffect,
  SenseEffect,
  SetEffect,
} from './effect-line';
import { labelOf } from './modifier';
import { ruleIdOf } from './rule-in-play';
import type { ModifierInputs, RuleInPlay } from './rule-in-play';
import { truthOf } from './rule-value';
import type { SenseInPlay } from './senses-in-play';

const APPLIED: EffectStatus = { kind: EffectStatusKind.Applied };
const INACTIVE: EffectStatus = { kind: EffectStatusKind.Inactive };

/** How the breakdown's line status reads as an effect's. */
function lineStatus(status: LineStatus): EffectStatus {
  switch (status.kind) {
    case LineStatusKind.Applied: {
      return APPLIED;
    }
    case LineStatusKind.Suppressed: {
      return { kind: EffectStatusKind.Suppressed, by: status.by, reason: status.reason };
    }
    case LineStatusKind.Conditional: {
      return { kind: EffectStatusKind.Conditional, summary: status.summary };
    }
    case LineStatusKind.Inactive: {
      return INACTIVE;
    }
    case LineStatusKind.Failed: {
      return { kind: EffectStatusKind.Failed, error: status.error, position: status.position };
    }
    default: {
      return status satisfies never;
    }
  }
}

/** How an override's status reads: a set override a later one replaced is suppressed, like a line a better one beats. */
function overrideStatus(status: OverrideStatus): EffectStatus {
  switch (status.kind) {
    case OverrideStatusKind.Applied: {
      return APPLIED;
    }
    case OverrideStatusKind.Replaced: {
      return { kind: EffectStatusKind.Suppressed, by: status.by, reason: SuppressionReason.Stacking };
    }
    case OverrideStatusKind.Conditional: {
      return { kind: EffectStatusKind.Conditional, summary: status.summary };
    }
    case OverrideStatusKind.Inactive: {
      return INACTIVE;
    }
    case OverrideStatusKind.Failed: {
      return { kind: EffectStatusKind.Failed, error: status.error, position: status.position };
    }
    default: {
      return status satisfies never;
    }
  }
}

function defenceStatus(status: DefenceStatus): EffectStatus {
  switch (status.kind) {
    case DefenceStatusKind.Applied: {
      return APPLIED;
    }
    case DefenceStatusKind.Superseded: {
      return { kind: EffectStatusKind.Suppressed, by: status.by, reason: SuppressionReason.Stacking };
    }
    case DefenceStatusKind.Conditional: {
      return { kind: EffectStatusKind.Conditional, summary: status.summary };
    }
    case DefenceStatusKind.Failed: {
      return { kind: EffectStatusKind.Failed, error: status.error, position: status.position };
    }
    default: {
      return status satisfies never;
    }
  }
}

/** A modifier's line on a statistic: a bonus unless its value is below 0. */
export function modifierEffect(selector: ModifierEffect['selector'], line: BreakdownLine): ModifierEffect {
  const { modifier, value, adjustedBy, status } = line;
  return {
    change: value !== undefined && value < 0 ? EffectChange.Penalty : EffectChange.Bonus,
    rule: modifier.id,
    label: modifier.label,
    origin: modifier.origin,
    selector,
    type: modifier.type,
    value,
    adjustedBy,
    status: lineStatus(status),
  };
}

export function setEffect(selector: SetEffect['selector'], line: OverrideLine): SetEffect {
  const { id, label, origin, phase, mode, value, replaced, result, status } = line;
  return {
    change: EffectChange.Set,
    rule: id,
    label,
    origin,
    selector,
    mode,
    phase,
    value,
    replaced,
    result,
    status: overrideStatus(status),
  };
}

export function adjustmentEffect(
  change: DamageAdjustmentEffect['change'],
  line: AdjustmentLine,
): DamageAdjustmentEffect {
  const { id, label, origin, type, value, exceptions, status } = line;
  return {
    change,
    rule: id,
    label,
    origin,
    damage: type,
    value,
    exceptions,
    status: defenceStatus(status),
  };
}

export function immunityEffect(line: ImmunityLine): ImmunityEffect {
  const { id, label, origin, type, status } = line;
  return {
    change: EffectChange.Immunity,
    rule: id,
    label,
    origin,
    immunity: type,
    status: defenceStatus(status),
  };
}

/** Whether a sense in play reads as the element's grant and has the entry among its origins. */
function senseHeld(
  element: SenseElement,
  entry: RuleInPlay['origin']['entry'],
  senses: readonly SenseInPlay[],
): boolean {
  const { sense, acuity = SenseAcuity.Precise, range } = element;
  return senses.some(
    (held) =>
      held.sense === sense &&
      held.acuity === acuity &&
      held.range === range &&
      held.origins.some((origin) => origin.entry === entry),
  );
}

/**
 * A `Sense` element's line. One whose predicate fails gives nothing, as on the sheet; one that depends on the situation
 * is conditional; one that holds is applied while a sense in play reads like it, else a better grant (or a battle
 * form's list) replaced it.
 */
export function senseEffect(rule: RuleInPlay, element: SenseElement, reading: SenseReading): SenseEffect | undefined {
  if (truthOf(element.predicate, reading.modifiers.facts) === Truth.False) {
    return undefined;
  }
  const { sense, acuity = SenseAcuity.Precise, range } = element;
  return {
    change: EffectChange.Sense,
    rule: ruleIdOf(rule),
    label: labelOf(rule),
    origin: rule.origin,
    sense,
    acuity,
    ...(range === undefined ? {} : { range }),
    status: senseStatus(rule, element, reading),
  };
}

/** The senses in play, and the rules they were read from. */
export interface SenseReading {
  readonly senses: readonly SenseInPlay[];
  readonly modifiers: ModifierInputs;
}

/** Whether a `Sense` element whose predicate does not fail is conditional, applied, or replaced by a better grant. */
function senseStatus(rule: RuleInPlay, element: SenseElement, { senses, modifiers }: SenseReading): EffectStatus {
  const { predicate, display } = element;
  if (predicate !== undefined && truthOf(predicate, modifiers.facts) === Truth.Unknown) {
    return {
      kind: EffectStatusKind.Conditional,
      summary: summarisePredicate(predicate, modifiers.facts, display?.summary),
    };
  }
  if (senseHeld(element, rule.origin.entry, senses)) {
    return APPLIED;
  }
  const form = battleFormInPlay(modifiers);
  const reason = form?.form.senses === undefined ? SuppressionReason.Stacking : SuppressionReason.Form;
  return { kind: EffectStatusKind.Suppressed, by: form?.id, reason };
}

/** The line for a rule element the summary does not cover. */
export function notSummarised(rule: RuleInPlay): NotSummarisedEffect {
  return {
    change: EffectChange.NotSummarised,
    rule: ruleIdOf(rule),
    label: labelOf(rule),
    origin: rule.origin,
    element: rule.element.key,
  };
}

/** The elements that have lines of their own; any other is `notSummarised`. */
export const SUMMARISED: ReadonlySet<RuleElementKey> = new Set([
  RuleElementKey.FlatModifier,
  RuleElementKey.Change,
  RuleElementKey.Weakness,
  RuleElementKey.Resistance,
  RuleElementKey.Immunity,
  RuleElementKey.Sense,
]);
