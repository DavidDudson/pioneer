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

/** A list inside another list is introduced ("either … or …", "both … and …"), so its scope reads clearly. */
function formatPart(part: PredicateSummary, format: SummaryFormat): string {
  const text = formatSummary(part, format);
  if (part.kind === SummaryKind.Any) {
    return format.message(message(PredicateMessage.Either, { list: text }));
  }
  if (part.kind === SummaryKind.All) {
    return format.message(message(PredicateMessage.Both, { list: text }));
  }
  return text;
}

function formatParts(parts: readonly PredicateSummary[], style: ListStyle, format: SummaryFormat): string {
  return format.list(
    parts.map((part) => formatPart(part, format)),
    style,
  );
}

/**
 * A summary as text in the viewer's locale: phrases translated, parts joined with the locale's "and" and "or",
 * and counts wrapped in their own messages. Pure; the locale lives in `format`.
 */
export function formatSummary(summary: PredicateSummary, format: SummaryFormat): string {
  if (summary.kind === SummaryKind.Phrase) {
    return format.message(summary.message);
  }
  if (summary.kind === SummaryKind.Authored) {
    return summary.text;
  }
  if (!('negated' in summary)) {
    const style = summary.kind === SummaryKind.All ? ListStyle.Conjunction : ListStyle.Disjunction;
    return formatParts(summary.parts, style, format);
  }
  const list = formatParts(summary.parts, ListStyle.Conjunction, format);
  const key = summary.kind === SummaryKind.ExactlyOne ? PredicateMessage.ExactlyOne : PredicateMessage.AllOrNone;
  return format.message(message(key, { list, negated: summary.negated }));
}
