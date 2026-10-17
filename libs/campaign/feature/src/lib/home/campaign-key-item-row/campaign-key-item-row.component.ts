import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { KeyItemRunes, KeyItemView } from '@pioneer/campaign/domain';
import { Badge, Link, ListItem, Stack, Text } from '@pioneer/frontier';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { CampaignKeyItemHolder } from '../campaign-key-item-holder/campaign-key-item-holder.component';

/** A link to the sheet of the character holding a key item. */
interface SheetLink {
  readonly to: readonly string[];
  readonly name: string;
}

/** The grades a key item states, in the order the rules write them, with the message that says each. */
const GRADED = [
  ['potency', 'campaign.keyItems.rune.potency'],
  ['striking', 'campaign.keyItems.rune.striking'],
  ['resilient', 'campaign.keyItems.rune.resilient'],
  ['reinforcing', 'campaign.keyItems.rune.reinforcing'],
] as const;

/** What a key item's runes say, as the messages the row shows: each grade it states, then the property runes. */
export function runeLines({ property, ...grades }: KeyItemRunes): readonly MessageDescriptor[] {
  const graded = GRADED.flatMap(([rune, key]): MessageDescriptor[] => {
    const grade = grades[rune];
    return grade === undefined ? [] : [message(key, { grade })];
  });
  const names = property.map(({ name }) => name).join(', ');
  return property.length === 0
    ? graded
    : [...graded, message('campaign.keyItems.rune.property', { count: property.length, names })];
}

/**
 * One key item: its name, the base item it is, the runes the GM stated, the notes and who holds it, or that the party
 * stash does. The GM also gets the controls that give, move, take back and archive it. A player reads it only.
 */
@Component({
  selector: 'pio-campaign-key-item-row',
  imports: [Badge, CampaignKeyItemHolder, Link, ListItem, Stack, Text, TranslocoPipe],
  templateUrl: './campaign-key-item-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CampaignKeyItemRow {
  public readonly keyItem = input.required<KeyItemView>();
  /** Whether the viewer may change it: the GM. */
  public readonly manageable = input.required<boolean>();

  protected readonly runes = computed(() => runeLines(this.keyItem().runes));
  /** The holder's sheet, when the viewer owns the holder: nobody else may open it (ADR-0007). */
  protected readonly sheet = computed((): SheetLink | undefined => {
    const { holder, holderName, holderOwned } = this.keyItem();
    return holder !== undefined && holderName !== undefined && holderOwned
      ? { to: ['/characters', holder], name: holderName }
      : undefined;
  });
  /** Who holds it, or that the party stash does. */
  protected readonly holder = computed((): MessageDescriptor => {
    const { holderName } = this.keyItem();
    return holderName === undefined
      ? message('campaign.keyItems.inStash')
      : message('campaign.keyItems.heldBy', { holder: holderName });
  });
}
