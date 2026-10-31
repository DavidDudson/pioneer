import type { InventoryItem, InventoryItemId, InventoryItemName } from './inventory';
import { CarryState } from './item-carry';

/** Small edits to one inventory line, shared by the inventory's edits. */
export function movedOut(item: InventoryItem, container: InventoryItemId | undefined, dropped: boolean): InventoryItem {
  const moved = withContainer(item, container);
  return dropped ? { ...moved, carry: { state: CarryState.Dropped } } : moved;
}

export function withContainer(item: InventoryItem, container: InventoryItemId | undefined): InventoryItem {
  const { container: _old, ...rest } = item;
  return container === undefined ? rest : { ...rest, container };
}

export function withName(item: InventoryItem, name: InventoryItemName | undefined): InventoryItem {
  const { name: _old, ...rest } = item;
  return name === undefined ? rest : { ...rest, name };
}
