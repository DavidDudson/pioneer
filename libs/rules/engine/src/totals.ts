import { LineStatusKind } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { pinTotal } from './change';
import type { ChangeSource } from './change';
import { whole } from './rule-value';
import type { RuleContext } from './rule-value';
import { totalOutOfRange } from './statistic-result';
import type { StatisticResult } from './statistic-result';

/** What the modifier phase found for one statistic: its lines, and the set overrides on it. */
export interface Finishing {
  readonly lines: readonly BreakdownLine[];
  readonly sets: readonly ChangeSource[];
  readonly context: RuleContext;
}

/**
 * The base result with its lines and its totals: computed (the base plus every applied line), then pinned by the
 * last set override that applies, if any. A failed statistic has neither, and one whose lines add up past the safe
 * integer range fails rather than throwing.
 */
export function finished(result: StatisticResult, { lines, sets, context }: Finishing): StatisticResult {
  if (!result.ok) {
    return result;
  }
  let sum = 0;
  for (const { status, value } of lines) {
    if (status.kind === LineStatusKind.Applied && value !== undefined) {
      sum += value;
    }
  }
  const computed = whole(result.baseValue + sum);
  if (computed === undefined) {
    return totalOutOfRange(result.selector);
  }
  const pinned = pinTotal(computed, sets, context);
  return {
    ...result,
    lines,
    computed,
    total: pinned.value,
    overrides: [...result.overrides, ...pinned.lines],
    pinnedBy: pinned.pinnedBy,
  };
}
