import { FORMULA_VALUE_MAX, TextPosition } from '@pioneer/rules/formula';
import type { FormulaReference, FormulaValue } from '@pioneer/rules/formula';
import type { Feet, Selector } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import type { BaseTerm } from './base-term';
import type { BreakdownLine, ModifierLabel, OverrideLine } from './breakdown';
import { EngineMessage } from './messages';
import type { RuleId } from './rule-in-play';
import type { StatisticEdge } from './statistic-graph';
import type { MissingInput } from './statistic-inputs';

/** Whose value a statistic shows while a battle form is in play. */
export const FormSource = { Form: 'form', Own: 'own' } as const;
export type FormSource = ValueOf<typeof FormSource>;

/**
 * How a battle form bears on a statistic it replaces. When `source` is `form`, the total is the form's `base` plus
 * the applied lines left after the form removed armour and item bonuses, and `own` is what the character's own would
 * have been. When it is `own`, the character's own was higher and nothing changed: `value` is the form's, which lost.
 */
export interface FormReplacement {
  readonly source: FormSource;
  /** The form's rule element. */
  readonly rule: RuleId;
  readonly label: ModifierLabel;
  /** The form's own value for the statistic, before any line. */
  readonly base: FormulaValue;
  /** What the form gives in all: its base plus the lines that still apply. */
  readonly value: FormulaValue;
  /** The total the character's own statistic has without the form. */
  readonly own: FormulaValue;
  /** "22 from Plant Form (arboreal); yours 19", worded by the sheet with the form's name. */
  readonly summary: ModifierLabel;
}

/**
 * How terrain that costs extra movement bears on a Speed: the Speed shown is what a Stride covers, `was` the Speed
 * before the cost. The sheet names the source with `label` and words it with `EngineMessage.MovementCostReduces`.
 */
export interface MovementCostReduction {
  readonly rule: RuleId;
  readonly label: ModifierLabel;
  /** What each square costs beyond itself, in feet. */
  readonly extra: Feet;
  readonly was: FormulaValue;
}

/**
 * A statistic's breakdown: its base formula term by term and the value they add up to, the `Change`s that turned
 * that into its base, every modifier that reaches it as a line, the total those compute, and the total shown,
 * which a set override may pin.
 */
export interface StatisticValue {
  readonly ok: true;
  readonly selector: Selector;
  readonly base: readonly BaseTerm[];
  /** What the base formula's terms add up to. */
  readonly formulaValue: FormulaValue;
  /** The base after its `Change`s: what modifiers add to, and what `@stat.<selector>` reads. */
  readonly baseValue: FormulaValue;
  readonly lines: readonly BreakdownLine[];
  /** The base plus the applied lines. */
  readonly computed: FormulaValue;
  /** The computed total, or the value a set override pinned it to. */
  readonly total: FormulaValue;
  /** Base-phase `Change`s in the order they ran, then set overrides. */
  readonly overrides: readonly OverrideLine[];
  /** The set override that pinned the total, if one did; the sheet flags the statistic wherever it appears. */
  readonly pinnedBy: RuleId | undefined;
  /** Set when a battle form replaces this statistic; absent otherwise. */
  readonly form?: FormReplacement;
  /** Set when terrain that costs extra movement lowers this Speed; absent otherwise. */
  readonly movementCost?: MovementCostReduction;
}

/** Why a statistic has no value, pointing into its base formula. */
export interface StatisticFailure {
  readonly ok: false;
  readonly selector: Selector;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

export type StatisticResult = StatisticValue | StatisticFailure;

const SIGIL = '@';
const LIST_SEPARATOR = ', ';

export function failure(selector: Selector, error: MessageDescriptor, position: TextPosition): StatisticFailure {
  return { ok: false, selector, error, position };
}

/** Where a total that leaves the safe integer range points: the start of the base formula, as no line is to blame. */
const TOTAL_POSITION = TextPosition.parse(1);

/** A statistic whose applied lines add up past the safe integer range. */
export function totalOutOfRange(selector: Selector): StatisticFailure {
  return failure(selector, message(EngineMessage.TotalOutOfRange, { maximum: FORMULA_VALUE_MAX }), TOTAL_POSITION);
}

/** A statistic in a cycle, failing at `edge`, its reference into the cycle; `members` are named in selector order. */
export function cycle(selector: Selector, edge: StatisticEdge, members: readonly Selector[]): StatisticFailure {
  const statistics = members.join(LIST_SEPARATOR);
  const params = { found: `${SIGIL}${edge.path}`, position: edge.position, statistics, count: members.length };
  return failure(selector, message(EngineMessage.StatisticCycle, params), edge.position);
}

/** A statistic whose formula reads, at `reference`, an ancestry or class the character has not chosen yet. */
export function unchosen(
  selector: Selector,
  { path, position }: FormulaReference,
  key: MissingInput,
): StatisticFailure {
  return failure(selector, message(key, { found: `${SIGIL}${path}`, position }), position);
}

/** A statistic that cannot read the statistic at `edge`: it is missing, or it failed. */
export function unreadable(
  selector: Selector,
  edge: StatisticEdge,
  key: typeof EngineMessage.MissingStatistic | typeof EngineMessage.FailedDependency,
): StatisticFailure {
  const params = { found: `${SIGIL}${edge.path}`, position: edge.position, selector: edge.selector };
  return failure(selector, message(key, params), edge.position);
}
