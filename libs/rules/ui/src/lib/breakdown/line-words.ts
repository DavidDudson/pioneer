import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import type { BreakdownLine, ModifierLabel } from '@pioneer/rules/engine';
import type { SummaryFormat } from '@pioneer/rules/predicate';
import type { ContentId } from '@pioneer/rules/sdk';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BreakdownMessage, MODIFIER_TYPE_MESSAGES } from './breakdown-messages';
import { SIGNED } from './number-style';

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

/** "+1 status": a modifier line's signed value and its type; just the type for a failed line, which has no value. */
export function lineValue({ modifier, value }: BreakdownLine, i18n: TranslocoService, format: LocaleFormat): string {
  const type: string = i18n.translate(MODIFIER_TYPE_MESSAGES[modifier.type]);
  const text: string = i18n.translate(BreakdownMessage.LineValue, {
    hasValue: value === undefined ? 'no' : 'yes',
    value: value === undefined ? '' : format.number(value, SIGNED),
    type,
  });
  return text;
}
