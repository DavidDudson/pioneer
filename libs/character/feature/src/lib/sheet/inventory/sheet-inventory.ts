import { isContainer, ItemPlacement, itemPlacement } from '@pioneer/character/domain';
import type { Inventory, InventoryItem, InventoryItemId, ItemContent } from '@pioneer/character/domain';
import type { SelectOption } from '@pioneer/frontier';
import type { ContentId } from '@pioneer/rules/sdk';
import { InventoryPlacement } from '@pioneer/rules/ui';
import type { InventoryGroup, InventoryLine } from '@pioneer/rules/ui';

/** The groups in sheet order. */
const PLACEMENTS: readonly ItemPlacement[] = [ItemPlacement.Worn, ItemPlacement.Held, ItemPlacement.Stowed];

const GROUP_OF: Readonly<Record<ItemPlacement, InventoryPlacement>> = {
  [ItemPlacement.Worn]: InventoryPlacement.Worn,
  [ItemPlacement.Held]: InventoryPlacement.Held,
  [ItemPlacement.Stowed]: InventoryPlacement.Stowed,
};

/** What each container holds, by the container's id. */
function contentsByContainer(items: readonly InventoryItem[]): ReadonlyMap<InventoryItemId, readonly InventoryItem[]> {
  const contents = new Map<InventoryItemId, InventoryItem[]>();
  for (const each of items) {
    if (each.container !== undefined) {
      contents.set(each.container, [...(contents.get(each.container) ?? []), each]);
    }
  }
  return contents;
}

/**
 * The inventory as the sheet lists it: loose items grouped worn, held and stowed (from their content's usage until
 * #472), each container with what it holds beneath it. Empty groups are left out.
 */
export function sheetInventory(inventory: Inventory, content: ItemContent): readonly InventoryGroup[] {
  const contents = contentsByContainer(inventory.items);
  const lineOf = (item: InventoryItem): InventoryLine => {
    const entry = content.get(item.item);
    return {
      id: item.id,
      name: item.name ?? entry?.name,
      contentName: item.name === undefined ? undefined : entry?.name,
      quantity: item.quantity,
      bulk: entry?.data.bulk,
      bulkPer: entry?.data.bulkPer,
      contents: (contents.get(item.id) ?? []).map((inside) => lineOf(inside)),
    };
  };
  const loose = inventory.items.filter((each) => each.container === undefined);
  return PLACEMENTS.map((placement) => ({
    placement: GROUP_OF[placement],
    lines: loose
      .filter((each) => itemPlacement(content.get(each.item), false) === placement)
      .map((each) => lineOf(each)),
  })).filter((group) => group.lines.length > 0);
}

/** The value of the "carried loose" option where an item can be put. */
export const LOOSE = '';

/**
 * Where an item can go: every container the character has, by its name, less `moving` and whatever it holds, so a
 * container is never offered a place inside itself. Undefined `moving` is a new item.
 */
export function containerOptions(
  inventory: Inventory,
  content: ItemContent,
  moving: InventoryItemId | undefined,
): readonly SelectOption<string>[] {
  const excluded = moving === undefined ? new Set<InventoryItemId>() : heldBy(inventory.items, moving);
  return inventory.items
    .filter((each) => isContainer(content.get(each.item)) && !excluded.has(each.id))
    .map((each) => ({ value: each.id, label: each.name ?? content.get(each.item)?.name ?? each.id }));
}

/** `id` and everything inside it, however deep. */
function heldBy(items: readonly InventoryItem[], id: InventoryItemId): ReadonlySet<InventoryItemId> {
  const held = new Set([id]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const each of items) {
      if (each.container !== undefined && held.has(each.container) && !held.has(each.id)) {
        held.add(each.id);
        grew = true;
      }
    }
  }
  return held;
}

const ITEM_MATCHES_MAX = 50;

/** The items whose name contains `query`, ignoring case, by name; at most `ITEM_MATCHES_MAX`. */
export function itemOptions(
  content: ItemContent,
  query: string,
  compare: (left: string, right: string) => number,
): readonly SelectOption<ContentId>[] {
  const needle = query.trim().toLocaleLowerCase();
  return [...content.values()]
    .filter((entry) => entry.name.toLocaleLowerCase().includes(needle))
    .toSorted((left, right) => compare(left.name, right.name))
    .slice(0, ITEM_MATCHES_MAX)
    .map((entry) => ({ value: entry.id, label: entry.name }));
}
