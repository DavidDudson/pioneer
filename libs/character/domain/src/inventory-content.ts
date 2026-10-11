import { ContentKind, UsageType } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';

import { InventoryRefusalField } from './inventory';
import type { Inventory, InventoryItemId, InventoryRefusal } from './inventory';

/** The kinds a character carries. Kits expand into these (#475); runes are etched onto them (#474). */
export const INVENTORY_KINDS = [
  ContentKind.Armor,
  ContentKind.Consumable,
  ContentKind.Equipment,
  ContentKind.Shield,
  ContentKind.Treasure,
  ContentKind.Weapon,
] as const;
export type InventoryKind = (typeof INVENTORY_KINDS)[number];

const KINDS: ReadonlySet<ContentKind> = new Set(INVENTORY_KINDS);

/** A content entry the inventory can hold. */
export type ItemEntry = Extract<ContentEntry, { readonly kind: InventoryKind }>;

function isItemEntry(entry: ContentEntry): entry is ItemEntry {
  return KINDS.has(entry.kind);
}

/** Every item the loaded packs offer, by id. */
export type ItemContent = ReadonlyMap<ContentId, ItemEntry>;

/** The items in `registry`'s packs. A later pack's entry of the same id wins, as in the registry. */
export function itemContent(registry: ContentRegistry): ItemContent {
  const items = registry.packs.flatMap((pack) => pack.otherEntries.filter((entry) => isItemEntry(entry)));
  return new Map(items.map((entry) => [entry.id, entry]));
}

/** Whether `entry` can hold other items: equipment with a container's capacity (Foundry pf2e's `backpack`). */
export function isContainer(entry: ItemEntry | undefined): boolean {
  return entry?.kind === ContentKind.Equipment && entry.data.container !== undefined;
}

/** An item to add or move, as the content refusal reads it. */
export interface ItemEdit {
  readonly item?: ContentId | undefined;
  readonly container?: InventoryItemId | undefined;
}

/**
 * Refuses an item no loaded pack has as a carried kind, and a container whose content can't hold items. Run after
 * `inventoryRefusal`, which checks the container is in the inventory. A stored item whose content has since gone is
 * kept and only refused as a container.
 */
export function itemRefusal(
  content: ItemContent,
  inventory: Inventory,
  { item, container }: ItemEdit,
): InventoryRefusal | undefined {
  if (item !== undefined && !content.has(item)) {
    return { field: InventoryRefusalField.Item, message: message('character.validation.unknownItem') };
  }
  if (container === undefined) {
    return undefined;
  }
  const holder = inventory.items.find((each) => each.id === container);
  if (holder === undefined || !isContainer(content.get(holder.item))) {
    return { field: InventoryRefusalField.Container, message: message('character.validation.notAContainer') };
  }
  return undefined;
}

/** Where an item is on the character, as the inventory groups it. */
export const ItemPlacement = { Worn: 'worn', Held: 'held', Stowed: 'stowed' } as const;
export type ItemPlacement = ValueOf<typeof ItemPlacement>;

/**
 * Where an item sits until #472 lets the player choose: stowed inside a container; otherwise worn or held as its
 * content uses it (armour is worn, a shield held); everything else stowed. Unknown content is stowed.
 */
export function itemPlacement(entry: ItemEntry | undefined, inContainer: boolean): ItemPlacement {
  if (inContainer || entry === undefined) {
    return ItemPlacement.Stowed;
  }
  switch (entry.kind) {
    case ContentKind.Armor: {
      return ItemPlacement.Worn;
    }
    case ContentKind.Shield: {
      return ItemPlacement.Held;
    }
    case ContentKind.Consumable:
    case ContentKind.Equipment:
    case ContentKind.Weapon: {
      return placementOf(entry.data.usage?.type);
    }
    case ContentKind.Treasure: {
      return ItemPlacement.Stowed;
    }
    default: {
      const unreachable: never = entry;
      throw new TypeError(`Unhandled item kind: ${JSON.stringify(unreachable)}`);
    }
  }
}

function placementOf(usage: UsageType | undefined): ItemPlacement {
  if (usage === UsageType.Worn) {
    return ItemPlacement.Worn;
  }
  if (usage === UsageType.Held) {
    return ItemPlacement.Held;
  }
  return ItemPlacement.Stowed;
}
