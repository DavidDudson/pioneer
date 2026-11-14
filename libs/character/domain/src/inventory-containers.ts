import type { InventoryItem, InventoryItemId } from './inventory';

/** The item ids that hold `id`, innermost first; stops at a loop, which `InventorySchema` refuses. */
export function containersOf(
  items: ReadonlyMap<InventoryItemId, InventoryItem>,
  id: InventoryItemId,
): InventoryItemId[] {
  const chain: InventoryItemId[] = [];
  let current = items.get(id)?.container;
  while (current !== undefined && !chain.includes(current)) {
    chain.push(current);
    current = items.get(current)?.container;
  }
  return chain;
}

export function byId(items: readonly InventoryItem[]): ReadonlyMap<InventoryItemId, InventoryItem> {
  return new Map(items.map((each) => [each.id, each]));
}
