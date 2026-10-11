import { ContentKind, ItemState, Trait, UsageHands, UsageType } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentRegistry, Usage } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { InventoryRefusalField } from './inventory';
import type { Inventory, InventoryItem, InventoryItemId, InventoryRefusal } from './inventory';
import { CarryState, HANDS_MAX, ONE_HAND } from './item-carry';
import type { Carry, Hands } from './item-carry';

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

/** An edit to an item, as the content refusal reads it: the item it adds or changes, where it stows it, how it
 * carries it and whether it invests it. */
export interface ItemEdit {
  /** The content an added item is. */
  readonly item?: ContentId | undefined;
  /** The inventory item an edit changes. */
  readonly id?: InventoryItemId | undefined;
  readonly container?: InventoryItemId | undefined;
  readonly carry?: Carry | undefined;
  readonly invested?: boolean | undefined;
}

const INVESTED = Trait.parse('invested');

/** Whether `entry` is worn as it is used: armour, or an item whose usage is worn. */
function isWearable(entry: ItemEntry): boolean {
  return entry.kind === ContentKind.Armor || usageOf(entry)?.type === UsageType.Worn;
}

/** Whether `entry` has the invested trait, and so works only while invested. */
export function isInvestable(entry: ItemEntry | undefined): boolean {
  return entry?.traits.includes(INVESTED) === true;
}

/** The usage an item's content gives it: armour and shields have none, as Foundry pf2e. */
function usageOf(entry: ItemEntry): Usage | undefined {
  switch (entry.kind) {
    case ContentKind.Consumable:
    case ContentKind.Equipment:
    case ContentKind.Weapon: {
      return entry.data.usage;
    }
    case ContentKind.Armor:
    case ContentKind.Shield:
    case ContentKind.Treasure: {
      return undefined;
    }
    default: {
      const unreachable: never = entry;
      throw new TypeError(`Unhandled item kind: ${JSON.stringify(unreachable)}`);
    }
  }
}

/** The fewest hands `entry` is held in: two for an item held in two hands, else one. */
export function handsNeeded(entry: ItemEntry | undefined): Hands {
  const usage = entry === undefined ? undefined : usageOf(entry);
  return usage?.type === UsageType.Held && usage.hands === UsageHands.Two ? HANDS_MAX : ONE_HAND;
}

/** Refuses a container whose content can't hold items. */
function containerRefusal(
  content: ItemContent,
  inventory: Inventory,
  container: InventoryItemId | undefined,
): InventoryRefusal | undefined {
  if (container === undefined) {
    return undefined;
  }
  const holder = inventory.items.find((each) => each.id === container);
  if (holder === undefined || !isContainer(content.get(holder.item))) {
    return { field: InventoryRefusalField.Container, message: message('character.validation.notAContainer') };
  }
  return undefined;
}

function carryRefused(refusal: MessageDescriptor): InventoryRefusal {
  return { field: InventoryRefusalField.Carry, message: refusal };
}

/** An item, and how an edit carries it. */
interface CarryEdit {
  readonly id: InventoryItemId;
  readonly carry: Carry;
}

/** Refuses wearing what isn't worn (anything but armour or a worn item, or content that is gone) and a second suit of armour. */
function wearRefusal(content: ItemContent, inventory: Inventory, id: InventoryItemId): InventoryRefusal | undefined {
  const entry = contentOf(content, inventory, id);
  if (entry === undefined || !isWearable(entry)) {
    return carryRefused(message('character.validation.notWearable'));
  }
  const armorWorn = inventory.items.some(
    (each) =>
      each.id !== id && each.carry.state === CarryState.Worn && content.get(each.item)?.kind === ContentKind.Armor,
  );
  return entry.kind === ContentKind.Armor && armorWorn
    ? carryRefused(message('character.validation.armorWorn'))
    : undefined;
}

/**
 * Refuses wearing what isn't worn (`wearRefusal`) and holding a two-handed item in one hand. Any item can be held,
 * stowed or dropped.
 */
function carryRefusal(
  content: ItemContent,
  inventory: Inventory,
  { id, carry }: CarryEdit,
): InventoryRefusal | undefined {
  if (carry.state === CarryState.Worn) {
    return wearRefusal(content, inventory, id);
  }
  if (carry.state === CarryState.Held && carry.hands < handsNeeded(contentOf(content, inventory, id))) {
    return carryRefused(message('character.validation.needsTwoHands'));
  }
  return undefined;
}

function contentOf(content: ItemContent, inventory: Inventory, id: InventoryItemId): ItemEntry | undefined {
  const item = inventory.items.find((each) => each.id === id);
  return item === undefined ? undefined : content.get(item.item);
}

/**
 * Refuses an item no loaded pack has as a carried kind, carrying an item in a way its content isn't carried
 * (`carryRefusal`), investing an item without the invested trait, and a container whose content can't hold items.
 * Run after `inventoryRefusal`, which checks the item and container are in the inventory and the limits. A stored
 * item whose content has since gone is kept, and only refused as a container, worn or invested.
 */
export function itemRefusal(
  content: ItemContent,
  inventory: Inventory,
  { item, id, container, carry, invested }: ItemEdit,
): InventoryRefusal | undefined {
  if (item !== undefined && !content.has(item)) {
    return { field: InventoryRefusalField.Item, message: message('character.validation.unknownItem') };
  }
  const refused = id === undefined || carry === undefined ? undefined : carryRefusal(content, inventory, { id, carry });
  if (refused !== undefined) {
    return refused;
  }
  if (id !== undefined && invested === true && !isInvestable(contentOf(content, inventory, id))) {
    return { field: InventoryRefusalField.Invested, message: message('character.validation.notInvestable') };
  }
  return containerRefusal(content, inventory, container);
}

/** Whether `carry` is how `entry` is used: armour worn, a shield or weapon held, otherwise as its usage says. */
function carriedAsUsed(entry: ItemEntry, carry: Carry): boolean {
  if (entry.kind === ContentKind.Armor) {
    return carry.state === CarryState.Worn;
  }
  if (entry.kind === ContentKind.Shield) {
    return carry.state === CarryState.Held;
  }
  const usage = usageOf(entry);
  if (usage?.type === UsageType.Worn) {
    return carry.state === CarryState.Worn;
  }
  if (usage?.type === UsageType.Held) {
    return carry.state === CarryState.Held && carry.hands >= handsNeeded(entry);
  }
  return carry.state === CarryState.Worn || carry.state === CarryState.Held;
}

/**
 * How an item works on the character, as its origin hop says: invested for an item with the invested trait, else
 * worn or held. Undefined while it does nothing: stowed or dropped, not worn or held as it is used, an invested-trait
 * item that isn't invested, or content no loaded pack has.
 */
export function activeState(item: InventoryItem, entry: ItemEntry | undefined): ItemState | undefined {
  if (entry === undefined || !carriedAsUsed(entry, item.carry)) {
    return undefined;
  }
  if (isInvestable(entry)) {
    return item.invested === true ? ItemState.Invested : undefined;
  }
  return item.carry.state === CarryState.Worn ? ItemState.Worn : ItemState.Held;
}
