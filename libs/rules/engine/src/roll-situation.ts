import { predicateOptions } from '@pioneer/rules/predicate';
import type { RollOption } from '@pioneer/rules/sdk';

import { LineStatusKind } from './breakdown';
import type { BreakdownLine } from './breakdown';
import type { StatisticValue } from './statistic-result';

/** What a roll of one statistic can choose: the lines whose situation it may claim, and the options that move lines. */
export interface RollSituation {
  /**
   * The conditional lines that could change the total if their situation held, in the breakdown's order. One an
   * applied line already beats (`beatenBy`) is left out, as choosing it would change nothing.
   */
  readonly conditional: readonly BreakdownLine[];
  /** Every roll option the predicates of the statistic's lines read, whatever their status. */
  readonly options: ReadonlySet<RollOption>;
}

function couldChange({ status }: BreakdownLine): boolean {
  return status.kind === LineStatusKind.Conditional && status.beatenBy === undefined;
}

/**
 * What rolling `statistic` can toggle (rules-engine.md, "Predicates and conditional modifiers"): its conditional lines,
 * which a roll chooses by passing their rule ids as `situation` to `deriveStatistics`, and the roll options its lines
 * read, which a `RollOption` toggle on the character sets.
 */
export function rollSituation({ lines }: StatisticValue): RollSituation {
  const options = new Set<RollOption>();
  for (const { modifier } of lines) {
    for (const option of modifier.predicate === undefined ? [] : predicateOptions(modifier.predicate)) {
      options.add(option);
    }
  }
  return { conditional: lines.filter((line) => couldChange(line)), options };
}
