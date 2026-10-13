import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import { LineStatusKind } from '@pioneer/rules/engine';
import type { StatisticValue } from '@pioneer/rules/engine';
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
 * The lines of a derived statistic that apply only in some situations and that no applied line of their type beats,
 * worded in the engine's order: "+2 circumstance when your shield is raised (Steel Shield)"; "in some situations" when
 * nothing words when.
 */
export function conditionalLines(
  statistic: StatisticValue,
  { i18n, format, names }: ConditionWords,
): readonly string[] {
  return statistic.lines.flatMap((line): string[] => {
    if (line.status.kind !== LineStatusKind.Conditional || line.status.beatenBy !== undefined) {
      return [];
    }
    const { summary } = line.status;
    return [
      i18n.translate(StatisticsMessage.Conditional, {
        value: lineValue(line, i18n, format),
        hasSummary: summary === undefined ? 'no' : 'yes',
        summary: summary === undefined ? '' : formatSummary(summary, summaryFormat(i18n, format)),
        name: labelName(line.modifier.label, names, (descriptor) => i18n.translate(descriptor.key, descriptor.params)),
      }),
    ];
  });
}
