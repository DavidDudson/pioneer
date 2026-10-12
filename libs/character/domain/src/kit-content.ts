import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, KitData } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { INVENTORY_ITEMS_MAX, InventoryRefusalField, ItemQuantity } from './inventory';
import type { Inventory, InventoryItemId, InventoryRefusal, NewItem } from './inventory';
import type { ItemContent } from './inventory-content';

/** A kit content entry: the items it holds and what it costs as one purchase. */
export type KitEntry = Extract<ContentEntry, { readonly kind: typeof ContentKind.Kit }>;

/** Every kit the loaded packs offer, by id. */
export type KitContent = ReadonlyMap<ContentId, KitEntry>;

function isKitEntry(entry: ContentEntry): entry is KitEntry {
  return entry.kind === ContentKind.Kit;
}

/** The kits in `registry`'s packs. A later pack's entry of the same id wins, as in the registry. */
export function kitContent(registry: ContentRegistry): KitContent {
  const kits = registry.packs.flatMap((pack) => pack.otherEntries.filter((entry) => isKitEntry(entry)));
  return new Map(kits.map((entry) => [entry.id, entry]));
}

/** Every item content a kit names: what it holds, and what its containers hold. */
function kitItemIds({ items }: KitData): readonly ContentId[] {
  return items.flatMap(({ item, contents = [] }) => [item, ...contents.map((inner) => inner.item)]);
}

/**
 * The inventory lines `kit` expands into, each with the id `newItemId` gives it: what it holds goes in `container`, or
 * loose when it is undefined, and what a container in the kit holds goes in that container (a backpack's rope and
 * torches).
 */
export function kitItems(
  kit: KitData,
  container: InventoryItemId | undefined,
  newItemId: () => InventoryItemId,
): readonly NewItem[] {
  return kit.items.flatMap(({ item, quantity, contents = [] }) => {
    const id = newItemId();
    const inside = contents.map((inner): NewItem => ({
      id: newItemId(),
      item: inner.item,
      quantity: ItemQuantity.parse(inner.quantity),
      container: id,
    }));
    return [{ id, item, quantity: ItemQuantity.parse(quantity), container }, ...inside];
  });
}

/** What a kit edit reads: the kits and items the loaded packs offer. */
export interface KitReads {
  readonly kits: KitContent;
  readonly items: ItemContent;
}

/**
 * Refuses a kit no loaded pack has, one holding an item no loaded pack has (a kit is added whole or not at all), and
 * one whose items would take the inventory past its limit. Where its items go is `inventoryRefusal`'s and
 * `itemRefusal`'s to check.
 */
export function kitRefusal(
  { kits, items }: KitReads,
  inventory: Inventory,
  kit: ContentId,
): InventoryRefusal | undefined {
  const entry = kits.get(kit);
  if (entry === undefined) {
    return { field: InventoryRefusalField.Kit, message: message('character.validation.unknownKit') };
  }
  const ids = kitItemIds(entry.data);
  if (ids.some((id) => !items.has(id))) {
    return { field: InventoryRefusalField.Kit, message: message('character.validation.unknownKitItem') };
  }
  if (inventory.items.length + ids.length > INVENTORY_ITEMS_MAX) {
    return {
      field: InventoryRefusalField.Kit,
      message: message('character.validation.kitOverfills', { maximum: INVENTORY_ITEMS_MAX }),
    };
  }
  return undefined;
}
