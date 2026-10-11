import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import type { ModifierLabel } from '@pioneer/rules/engine';
import type { SummaryFormat } from '@pioneer/rules/predicate';
import type { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

/** How the rules UI words a predicate summary: messages through the translator, lists in the active locale. */
export function summaryFormat(i18n: TranslocoService, format: LocaleFormat): SummaryFormat {
  return {
    message: (descriptor): string => i18n.translate(descriptor.key, descriptor.params),
    list: (items, style): string => format.list(items, style),
  };
}

/** What a label calls its line: its own text, else its entry's name (the id when the entry has none), else a message. */
export function labelName(
  label: ModifierLabel,
  entryNames: ReadonlyMap<ContentId, string>,
  translate: (descriptor: MessageDescriptor) => string,
): string {
  if ('text' in label) {
    return label.text;
  }
  if ('entry' in label) {
    return entryNames.get(label.entry) ?? label.entry;
  }
  return translate(label.message);
}
