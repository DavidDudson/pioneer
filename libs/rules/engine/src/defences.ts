import type { TextPosition } from '@pioneer/rules/formula';
import { summarisePredicate, Truth } from '@pioneer/rules/predicate';
import type { PredicateFacts, PredicateSummary } from '@pioneer/rules/predicate';
import { DamageAmount, RuleElementKey } from '@pioneer/rules/sdk';
import type {
  CreatureDefinition,
  DamageAdjustment,
  DamageAdjustmentTarget,
  DamageExceptions,
  Immunity,
  ImmunityElement,
  Origin,
  Predicate,
  ResistanceElement,
  WeaknessElement,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { ModifierLabel } from './breakdown';
import { basePhase } from './derive-statistics';
import type { StatisticContent } from './derive-statistics';
import { EngineMessage } from './messages';
import { labelOf } from './modifier';
import { NO_MODIFIERS, ruleIdOf } from './rule-in-play';
import type { ModifierInputs, RuleId, RuleInPlay } from './rule-in-play';
import { truthOf, valueOf, whole } from './rule-value';
import type { RuleContext } from './rule-value';
import type { StatisticInputs } from './statistic-inputs';

/** The defences the dice damage pipeline reads, in the shape of a creature's (`DamageTarget` in `libs/rules/dice`). */
export type DefenceTarget = Pick<CreatureDefinition, 'immunities' | 'weaknesses' | 'resistances'>;

export const DefenceStatusKind = {
  Applied: 'applied',
  Superseded: 'superseded',
  Conditional: 'conditional',
  Failed: 'failed',
} as const;
export type DefenceStatusKind = ValueOf<typeof DefenceStatusKind>;

/** The predicate depends on facts the sheet does not know; `summary` words when it would hold. */
interface Conditional {
  readonly kind: typeof DefenceStatusKind.Conditional;
  readonly when: Predicate;
  readonly summary: PredicateSummary | undefined;
}

/** Whether an immunity counts: always, or only when its predicate holds. */
export type ImmunityStatus = { readonly kind: typeof DefenceStatusKind.Applied } | Conditional;

/**
 * Whether a weakness or resistance counts: it does, a higher one to the same type with the same exceptions does
 * instead (`by`), it depends on the situation, or its value failed to evaluate.
 */
export type AdjustmentStatus =
  | { readonly kind: typeof DefenceStatusKind.Applied }
  | { readonly kind: typeof DefenceStatusKind.Superseded; readonly by: RuleId }
  | Conditional
  | {
      readonly kind: typeof DefenceStatusKind.Failed;
      readonly error: MessageDescriptor;
      /** Where in the failing formula; undefined when the value is out of range. */
      readonly position: TextPosition | undefined;
    };

/** What every defence line has: the element it comes from, what it is called, its origin and its exceptions. */
interface DefenceSource {
  readonly id: RuleId;
  readonly label: ModifierLabel;
  readonly origin: Origin;
  /** Damage with one of these gets past the defence; empty when none. */
  readonly exceptions: DamageExceptions;
}

/** One `Immunity` element in play, to a damage type, condition or effect. */
export interface ImmunityLine extends DefenceSource {
  readonly type: Immunity;
  readonly status: ImmunityStatus;
}

/** One `Weakness` or `Resistance` element in play. */
export interface AdjustmentLine extends DefenceSource {
  readonly type: DamageAdjustmentTarget;
  /** Undefined only when the line failed. */
  readonly value: DamageAmount | undefined;
  readonly status: AdjustmentStatus;
}

/**
 * A character's defences (rules-engine.md, "Defences"): each list in id order, with `target`, the ones that apply
 * unconditionally, for the damage pipeline.
 */
export interface Defences {
  readonly immunities: readonly ImmunityLine[];
  readonly weaknesses: readonly AdjustmentLine[];
  readonly resistances: readonly AdjustmentLine[];
  readonly target: DefenceTarget;
}

const NO_EXCEPTIONS: DamageExceptions = [];

function sourceOf(rule: RuleInPlay, exceptions: DamageExceptions | undefined): DefenceSource {
  return { id: ruleIdOf(rule), label: labelOf(rule), origin: rule.origin, exceptions: exceptions ?? NO_EXCEPTIONS };
}

type DefenceElement = ImmunityElement | WeaknessElement | ResistanceElement;

/** Applied when the predicate holds, conditional while it depends on the situation; undefined when it is false. */
function gate({ predicate, display }: DefenceElement, facts: PredicateFacts): ImmunityStatus | undefined {
  const truth = truthOf(predicate, facts);
  if (truth === Truth.False) {
    return undefined;
  }
  if (truth === Truth.True || predicate === undefined) {
    return { kind: DefenceStatusKind.Applied };
  }
  return {
    kind: DefenceStatusKind.Conditional,
    when: predicate,
    summary: summarisePredicate(predicate, facts, display?.summary),
  };
}

function immunityLine(rule: RuleInPlay, element: ImmunityElement, facts: PredicateFacts): ImmunityLine | undefined {
  const status = gate(element, facts);
  return status === undefined ? undefined : { ...sourceOf(rule, element.exceptions), type: element.type, status };
}

/** The largest `DamageAmount` (a Postgres smallint). */
const DAMAGE_AMOUNT_MAX = DamageAmount.maxValue ?? 0;

/** A value above the largest `DamageAmount`; a number has no formula position to point at. */
const OUT_OF_RANGE: AdjustmentStatus = {
  kind: DefenceStatusKind.Failed,
  error: message(EngineMessage.DefenceOutOfRange, { maximum: DAMAGE_AMOUNT_MAX }),
  position: undefined,
};

/** A line's value and status once its value is evaluated. */
interface Valued {
  readonly value: DamageAmount | undefined;
  readonly status: AdjustmentStatus;
}

/** The element's value, rounded down, with `status`; undefined below 1, failed when its formula fails or overflows. */
function valued(
  { value }: WeaknessElement | ResistanceElement,
  { rule, status }: { readonly rule: RuleInPlay; readonly status: ImmunityStatus },
  context: RuleContext,
): Valued | undefined {
  const outcome = valueOf(value, context.resolve(rule.itemLevel));
  if (!outcome.ok) {
    const { error, position } = outcome;
    return { value: undefined, status: { kind: DefenceStatusKind.Failed, error, position } };
  }
  const rounded = whole(outcome.value);
  if (rounded !== undefined && rounded < 1) {
    return undefined;
  }
  const amount = DamageAmount.safeParse(rounded);
  return amount.success ? { value: amount.data, status } : { value: undefined, status: OUT_OF_RANGE };
}

/**
 * A weakness's or resistance's line before stacking; undefined when its predicate is false or its value, rounded
 * down, is below 1 (`floor(@level / 2)` at level 1), since a defence of 0 does nothing.
 */
function adjustmentLine(
  rule: RuleInPlay,
  element: WeaknessElement | ResistanceElement,
  context: RuleContext,
): AdjustmentLine | undefined {
  const status = gate(element, context.facts);
  const outcome = status === undefined ? undefined : valued(element, { rule, status }, context);
  return outcome === undefined ? undefined : { ...sourceOf(rule, element.exceptions), type: element.type, ...outcome };
}

function sortedById<TLine extends DefenceSource>(lines: readonly TLine[]): readonly TLine[] {
  return lines.toSorted((left, right) => Number(left.id > right.id) - Number(left.id < right.id));
}

/** Whether two lines compete: the same type or group and the same exceptions, since exceptions differ per hit. */
function competes(left: AdjustmentLine, right: AdjustmentLine): boolean {
  return (
    left.type === right.type &&
    left.exceptions.length === right.exceptions.length &&
    left.exceptions.every((exception) => right.exceptions.includes(exception))
  );
}

/** Whether `line` counts over `best`: a higher value, or the same value and a lower id. */
function beats(line: AdjustmentLine, best: AdjustmentLine): boolean {
  const [value, bestValue] = [line.value ?? 0, best.value ?? 0];
  return value > bestValue || (value === bestValue && line.id < best.id);
}

/** An applied line, superseded when a higher applied one competes with it (on a tie, the lowest id counts). */
function supersede(line: AdjustmentLine, applied: readonly AdjustmentLine[]): AdjustmentLine {
  if (line.status.kind !== DefenceStatusKind.Applied) {
    return line;
  }
  let winner = line;
  for (const other of applied) {
    if (competes(other, line) && beats(other, winner)) {
      winner = other;
    }
  }
  return winner.id === line.id ? line : { ...line, status: { kind: DefenceStatusKind.Superseded, by: winner.id } };
}

/**
 * Weaknesses and resistances do not stack: of the applied lines that compete, the highest counts and the others are
 * superseded by it. Conditional and failed lines stay as they are, since a conditional one may beat it when it
 * applies.
 */
function stacked(lines: readonly AdjustmentLine[]): readonly AdjustmentLine[] {
  const sorted = sortedById(lines);
  const applied = sorted.filter(({ status }) => status.kind === DefenceStatusKind.Applied);
  return sorted.map((line) => supersede(line, applied));
}

function adjustmentOf({ type, value, exceptions, status }: AdjustmentLine): readonly DamageAdjustment[] {
  if (status.kind !== DefenceStatusKind.Applied || value === undefined) {
    return [];
  }
  return [exceptions.length === 0 ? { type, value } : { type, value, exceptions }];
}

/** The defences that apply unconditionally, each immunity once. */
function targetOf({ immunities, weaknesses, resistances }: Omit<Defences, 'target'>): DefenceTarget {
  const applied = immunities.filter(({ status }) => status.kind === DefenceStatusKind.Applied);
  return {
    immunities: [...new Set(applied.map(({ type }) => type))],
    weaknesses: weaknesses.flatMap((line) => adjustmentOf(line)),
    resistances: resistances.flatMap((line) => adjustmentOf(line)),
  };
}

function immunityLines(rules: readonly RuleInPlay[], facts: PredicateFacts): readonly ImmunityLine[] {
  return sortedById(
    rules.flatMap((rule) => {
      const { element } = rule;
      const line = element.key === RuleElementKey.Immunity ? immunityLine(rule, element, facts) : undefined;
      return line === undefined ? [] : [line];
    }),
  );
}

function adjustmentLines(
  rules: readonly RuleInPlay[],
  key: typeof RuleElementKey.Weakness | typeof RuleElementKey.Resistance,
  context: RuleContext,
): readonly AdjustmentLine[] {
  return stacked(
    rules.flatMap((rule) => {
      const { element } = rule;
      const line =
        (element.key === RuleElementKey.Weakness || element.key === RuleElementKey.Resistance) && element.key === key
          ? adjustmentLine(rule, element, context)
          : undefined;
      return line === undefined ? [] : [line];
    }),
  );
}

/**
 * A character's immunities, weaknesses and resistances from the `Immunity`, `Weakness` and `Resistance` elements in
 * play (rules-engine.md, "Defences"), each list in id order. A predicate that holds applies the defence, a false one
 * drops it, and one that depends on the situation makes it conditional. Values are formulas read as modifier values
 * are (the inputs, `@prof`, statistics' bases, `@item.level`); one that fails makes its line failed. Weaknesses and
 * resistances to the same type or group with the same exceptions do not stack (`stacked`). Exceptions are carried,
 * never applied: the dice pipeline checks them per damage instance. Never throws, and the result does not depend on
 * the order of the rules.
 */
export function deriveDefences(
  content: StatisticContent,
  inputs: StatisticInputs,
  modifierInputs: ModifierInputs = NO_MODIFIERS,
): Defences {
  const { context } = basePhase(content, inputs, modifierInputs);
  const { rules } = modifierInputs;
  const lists = {
    immunities: immunityLines(rules, context.facts),
    weaknesses: adjustmentLines(rules, RuleElementKey.Weakness, context),
    resistances: adjustmentLines(rules, RuleElementKey.Resistance, context),
  };
  return { ...lists, target: targetOf(lists) };
}
