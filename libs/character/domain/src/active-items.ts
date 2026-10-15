import { Origin, OriginHopKind } from '@pioneer/rules/sdk';
import type { ItemState, OriginHop } from '@pioneer/rules/sdk';

import type { Inventory, InventoryItem } from './inventory';
import { activeState } from './inventory-content';
import type { ItemContent, ItemEntry } from './inventory-content';

/** An item that works on the character: its inventory line, its content and how it works (its origin hop's state). */
export interface ActiveItem {
  readonly item: InventoryItem;
  readonly entry: ItemEntry;
  readonly state: ItemState;
}

/** How an item is in play: equipped (its physical benefits) or active (its magic). */
export type StateOf = (item: InventoryItem, entry: ItemEntry | undefined) => ItemState | undefined;

export function itemsIn(inventory: Inventory, content: ItemContent, stateOf: StateOf): readonly ActiveItem[] {
  return inventory.items.flatMap((item): ActiveItem[] => {
    const entry = content.get(item.item);
    const state = stateOf(item, entry);
    return entry === undefined || state === undefined ? [] : [{ item, entry, state }];
  });
}

/** The items whose magic works on the character, in inventory order (`activeState`). */
export function activeItems(inventory: Inventory, content: ItemContent): readonly ActiveItem[] {
  return itemsIn(inventory, content, activeState);
}

export function inventoryHop({ item, state }: ActiveItem): OriginHop {
  return { kind: OriginHopKind.Inventory, item: item.id, state };
}

/** Why an active item is on the character: its entry, reached through the inventory. */
export function originOf(active: ActiveItem): Origin {
  return Origin.parse({ hops: [inventoryHop(active)], entry: active.entry.id, sources: active.entry.sources });
}
