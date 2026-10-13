import type { TranslocoService } from '@jsverse/transloco';
import type { LocaleFormat } from '@pioneer/frontier';
import type { BreakdownLine, ModifierLabel } from '@pioneer/rules/engine';
import type { SummaryFormat } from '@pioneer/rules/predicate';
import { OriginHopKind } from '@pioneer/rules/sdk';
import type { ContentId, InventoryItemId, Origin } from '@pioneer/rules/sdk';
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

/** The display names a label's words come from: content entries, and the inventory items a character holds. */
export interface LabelNames {
  readonly entries: ReadonlyMap<ContentId, string>;
  readonly items?: ReadonlyMap<InventoryItemId, string> | undefined;
}

/** The name of what an origin points at: the inventory item it came through, else its entry; undefined when unnamed. */
function originName(origin: Origin, names: LabelNames): string | undefined {
  const hop = origin.hops.findLast((candidate) => candidate.kind === OriginHopKind.Inventory);
  const item = hop?.kind === OriginHopKind.Inventory ? names.items?.get(hop.item) : undefined;
  return item ?? names.entries.get(origin.entry);
}

/**
 * What a label calls its line: its own text, else its entry's name (the id when the entry has none), else a message,
 * whose named parameter takes the name of what the label's origin points at (the message's own value when unnamed).
 */
export function labelName(
  label: ModifierLabel,
  names: LabelNames,
  translate: (descriptor: MessageDescriptor) => string,
): string {
  if ('text' in label) {
    return label.text;
  }
  if ('entry' in label) {
    return names.entries.get(label.entry) ?? label.entry;
  }
  const { message, named } = label;
  const name = named === undefined ? undefined : originName(named.origin, names);
  if (named === undefined || name === undefined) {
    return translate(message);
  }
  return translate({ ...message, params: { ...message.params, [named.param]: name } });
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
