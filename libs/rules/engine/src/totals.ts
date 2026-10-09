import { FormulaValue } from '@pioneer/rules/formula';

import { LineStatusKind } from './breakdown';
import type { BreakdownLine } from './breakdown';
import { pinTotal } from './change';
import type { ChangeSource } from './change';
import type { RuleContext } from './rule-value';
import type { StatisticResult } from './statistic-result';

/** What the modifier phase found for one statistic: its lines, and the set overrides on it. */
export interface Finishing {
  readonly lines: readonly BreakdownLine[];
  readonly sets: readonly ChangeSource[];
  readonly context: RuleContext;
}

/**
 * The base result with its lines and its totals: computed (the base plus every applied line), then pinned by the
 * last set override that applies, if any. A failed statistic has neither.
 */
export function finished(result: StatisticResult, { lines, sets, context }: Finishing): StatisticResult {
  if (!result.ok) {
    return result;
  }
  let computed = result.baseValue;
  for (const { status, value } of lines) {
    if (status.kind === LineStatusKind.Applied && value !== undefined) {
      computed = FormulaValue.parse(computed + value);
    }
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
