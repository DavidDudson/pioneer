import type { Inventory, InventoryItemId } from './inventory';

/** `id` broken, or repaired. A broken item stays broken until the player marks it repaired. */
export function breakItem(inventory: Inventory, id: InventoryItemId, broken: boolean): Inventory {
  return {
    ...inventory,
    items: inventory.items.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const { broken: _old, ...rest } = item;
      return broken ? { ...rest, broken } : rest;
    }),
  };
}
