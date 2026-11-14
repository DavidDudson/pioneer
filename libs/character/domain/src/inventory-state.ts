import type { Inventory, InventoryItemId } from './inventory';
import { isEmptyState } from './item-state';
import type { ItemState } from './item-state';

/** `id` with `state` as what it holds; a state that holds nothing leaves the line with no `state` field. */
export function setItemState(inventory: Inventory, id: InventoryItemId, state: ItemState): Inventory {
  return {
    ...inventory,
    items: inventory.items.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const { state: _old, ...rest } = item;
      return isEmptyState(state) ? rest : { ...rest, state };
    }),
  };
}
