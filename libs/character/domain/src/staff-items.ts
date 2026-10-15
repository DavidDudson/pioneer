import { ContentKind, staffCharges } from '@pioneer/rules/sdk';
import type { Charges, ContentId, StaffRank } from '@pioneer/rules/sdk';

import type { InventoryItem } from './inventory';
import type { ItemContent, ItemEntry } from './inventory-content';

/** A spell a staff holds, the rank it is listed under and what casting it from the staff costs. */
export interface StaffSpell {
  readonly spell: ContentId;
  readonly rank: StaffRank;
  readonly charges: Charges;
}

/**
 * The spells a staff entry holds, cantrips first, or undefined when the entry is no staff: only a weapon or an item
 * with typed `staff` spells is one (play-and-campaigns.md, "Staves and charged items").
 */
export function staffSpellsOf(entry: ItemEntry | undefined): readonly StaffSpell[] | undefined {
  if (entry?.kind !== ContentKind.Weapon && entry?.kind !== ContentKind.Equipment) {
    return undefined;
  }
  return entry.data.staff?.flatMap(({ rank, spells }) =>
    spells.map((spell): StaffSpell => ({ spell, rank, charges: staffCharges(rank) })),
  );
}

/** The spells an inventory item holds as a staff, or undefined when the item is not one. */
export function staffSpells(item: InventoryItem, content: ItemContent): readonly StaffSpell[] | undefined {
  return staffSpellsOf(content.get(item.item));
}

/** Whether an inventory item is a staff. */
export function isStaff(item: InventoryItem, content: ItemContent): boolean {
  return staffSpells(item, content) !== undefined;
}
