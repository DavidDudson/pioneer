import type { ContentId } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { CharacterPatchField } from './character-patch';
import type { CharacterPatch } from './character-patch';
import { InventoryRefusalField, removeItem } from './inventory';
import type {
  Inventory,
  InventoryItem,
  InventoryItemId,
  InventoryItemName,
  InventoryRefusal,
  ItemQuantity,
} from './inventory';
import { STOWED } from './item-carry';
import type { KeyItemId } from './key-item-id';
import type { ItemRunes } from './rune-etching';

/** A key item as its holder's inventory line shows it. */
export interface KeyItemLine {
  readonly id: InventoryItemId;
  readonly keyItem: KeyItemId;
  readonly item: ContentId;
  readonly quantity: ItemQuantity;
  /** The key item's name, which the line shows in place of the content's. */
  readonly name: InventoryItemName;
  /** The runes as the GM stated them, past the caps if they like. */
  readonly runes: ItemRunes | undefined;
}

/** `inventory` with the key item's line added, stowed, and no player limit applied. */
export function withKeyItem(
  inventory: Inventory,
  { id, keyItem, item, quantity, name, runes }: KeyItemLine,
): Inventory {
  const line: InventoryItem =
    runes === undefined
      ? { id, item, quantity, name, carry: STOWED, keyItem }
      : { id, item, quantity, name, carry: STOWED, keyItem, runes };
  return { ...inventory, items: [...inventory.items, line] };
}

/** `inventory` with the line `id` linked to `keyItem`, as when the GM promotes a line the character already has. */
export function withKeyLink(inventory: Inventory, id: InventoryItemId, keyItem: KeyItemId): Inventory {
  return { ...inventory, items: inventory.items.map((each) => (each.id === id ? { ...each, keyItem } : each)) };
}

/** The line of `keyItem` in the inventory, if its holder has it. */
export function keyItemLine(inventory: Inventory, keyItem: KeyItemId): InventoryItem | undefined {
  return inventory.items.find((each) => each.keyItem === keyItem);
}

/** `inventory` without the line of `keyItem`, as when the GM takes it back; what the line held moves out of it. */
export function withoutKeyItem(inventory: Inventory, keyItem: KeyItemId): Inventory {
  const line = keyItemLine(inventory, keyItem);
  return line === undefined ? inventory : removeItem(inventory, line.id);
}

/**
 * Refuses a player's edit that would remove or sell a key item's line, or change how many it holds. Stowing, holding,
 * wearing and renaming it are the player's.
 */
export function keyItemRefusal(inventory: Inventory, patch: CharacterPatch): InventoryRefusal | undefined {
  if (patch.field !== CharacterPatchField.RemoveItem && patch.field !== CharacterPatchField.SetItemQuantity) {
    return undefined;
  }
  const line = inventory.items.find((each) => each.id === patch.id);
  return line?.keyItem === undefined
    ? undefined
    : { field: InventoryRefusalField.Id, message: message('character.validation.keyItemLocked') };
}
