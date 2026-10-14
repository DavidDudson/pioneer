import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import type { BreakdownLine, RuleId, StatisticValue } from '@pioneer/rules/engine';
import { formatSummary } from '@pioneer/rules/predicate';

import { labelName, lineValue, summaryFormat } from '../breakdown/line-words';
import type { LabelNames } from '../breakdown/line-words';
import { StatisticsMessage } from './statistics-messages';

/** What words a statistic's conditional lines: the translator, the locale's formats and the names of what lines come from. */
export interface ConditionWords {
  readonly i18n: TranslocoService;
  readonly format: LocaleFormat;
  readonly names: LabelNames;
}

/**
 * One line worded as a condition: "+2 circumstance when your shield is raised (Steel Shield)"; "in some situations"
 * when nothing words when, as for a line whose predicate is not conditional.
 */
export function conditionalLineText(line: BreakdownLine, { i18n, format, names }: ConditionWords): string {
  const summary = line.status.kind === LineStatusKind.Conditional ? line.status.summary : undefined;
  return i18n.translate(StatisticsMessage.Conditional, {
    value: lineValue(line, i18n, format),
    hasSummary: summary === undefined ? 'no' : 'yes',
    summary: summary === undefined ? '' : formatSummary(summary, summaryFormat(i18n, format)),
    name: labelName(line.modifier.label, names, (descriptor) => i18n.translate(descriptor.key, descriptor.params)),
  });
}

/**
 * The lines of a derived statistic that apply only in some situations and that no applied line of their type beats,
 * worded in the engine's order: "+2 circumstance when your shield is raised (Steel Shield)"; "in some situations" when
 * nothing words when. `claimable` leaves out the lines the page offers as toggles instead.
 */
export function conditionalLines(
  statistic: StatisticValue,
  words: ConditionWords,
  claimable: ReadonlySet<RuleId> = new Set(),
): readonly string[] {
  return statistic.lines
    .filter(
      ({ status, modifier }) =>
        status.kind === LineStatusKind.Conditional && status.beatenBy === undefined && !claimable.has(modifier.id),
    )
    .map((line) => conditionalLineText(line, words));
}
