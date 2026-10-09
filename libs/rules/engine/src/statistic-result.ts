import { FORMULA_VALUE_MAX, TextPosition } from '@pioneer/rules/formula';
import type { FormulaValue } from '@pioneer/rules/formula';
import type { Selector } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import type { BaseTerm } from './base-term';
import type { BreakdownLine, OverrideLine } from './breakdown';
import { EngineMessage } from './messages';
import type { RuleId } from './rule-in-play';
import type { StatisticEdge } from './statistic-graph';

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

/** A statistic that cannot read the statistic at `edge`: it is missing, or it failed. */
export function unreadable(
  selector: Selector,
  edge: StatisticEdge,
  key: typeof EngineMessage.MissingStatistic | typeof EngineMessage.FailedDependency,
): StatisticFailure {
  const params = { found: `${SIGIL}${edge.path}`, position: edge.position, selector: edge.selector };
  return failure(selector, message(key, params), edge.position);
}
