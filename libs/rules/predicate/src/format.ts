import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';

import { PredicateMessage } from './messages';
import { SummaryKind } from './summary';
import type { PredicateSummary } from './summary';

export const ListStyle = { Conjunction: 'conjunction', Disjunction: 'disjunction' } as const;
export type ListStyle = ValueOf<typeof ListStyle>;

/** The locale-bound pieces `formatSummary` needs; the UI supplies them from its translator and `Intl`. */
export interface SummaryFormat {
  readonly message: (descriptor: MessageDescriptor) => string;
  readonly list: (items: readonly string[], style: ListStyle) => string;
}

/** A phrase, authored text or negation as text; `undefined` for the kinds that join parts. */
function formatLeaf(summary: PredicateSummary, format: SummaryFormat): string | undefined {
  if (summary.kind === SummaryKind.Phrase) {
    return format.message(summary.message);
  }
  if (summary.kind === SummaryKind.Authored) {
    return summary.text;
  }
  if (summary.kind === SummaryKind.Not) {
    return format.message(message(PredicateMessage.Not, { summary: formatSummary(summary.part, format) }));
  }
  return undefined;
}

/**
 * A summary as text in the viewer's locale: phrases translated, parts joined with the locale's "and" and "or",
 * and negations and counts wrapped in their own messages. Pure; the locale lives in `format`.
 */
export function formatSummary(summary: PredicateSummary, format: SummaryFormat): string {
  const leaf = formatLeaf(summary, format);
  if (leaf !== undefined || !('parts' in summary)) {
    return leaf ?? '';
  }
  const parts = summary.parts.map((item) => formatSummary(item, format));
  if (summary.kind === SummaryKind.Any) {
    return format.list(parts, ListStyle.Disjunction);
  }
  const list = format.list(parts, ListStyle.Conjunction);
  if (summary.kind === SummaryKind.All) {
    return list;
  }
  const key = summary.kind === SummaryKind.ExactlyOne ? PredicateMessage.ExactlyOne : PredicateMessage.AllOrNone;
  return format.message(message(key, { list }));
}
