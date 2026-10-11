import { Coin, ContentId } from '@pioneer/rules/sdk';
import { message, Pg, Uuid } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/** One line of a character's inventory. Branded so it can't be passed where a content id is expected. */
export const InventoryItemId = Uuid.brand<'InventoryItemId'>();
export type InventoryItemId = z.infer<typeof InventoryItemId>;

/** How many of an item a line holds: 50 arrows are one line. */
export const ItemQuantity = Pg.smallint().positive().brand<'ItemQuantity'>();
export type ItemQuantity = z.infer<typeof ItemQuantity>;

export const INVENTORY_ITEM_NAME_MAX_LENGTH = 80;

/** A name the player gives one item ("Grandfather's sword"), shown in place of the content's. */
export const InventoryItemName = z
  .string()
  .trim()
  .min(1)
  .max(INVENTORY_ITEM_NAME_MAX_LENGTH)
  .brand<'InventoryItemName'>();
export type InventoryItemName = z.infer<typeof InventoryItemName>;

/** How many of one coin the character holds; a dragon's hoard runs past a smallint. */
export const CoinAmount = Pg.integer().nonnegative().brand<'CoinAmount'>();
export type CoinAmount = z.infer<typeof CoinAmount>;

const NO_COINS = CoinAmount.parse(0);

/** The character's purse: every coin, none when absent. */
export const CoinsSchema = z.strictObject({
  [Coin.Platinum]: CoinAmount.default(NO_COINS),
  [Coin.Gold]: CoinAmount.default(NO_COINS),
  [Coin.Silver]: CoinAmount.default(NO_COINS),
  [Coin.Copper]: CoinAmount.default(NO_COINS),
});
export type Coins = z.infer<typeof CoinsSchema>;

/**
 * An item the character has: the content it is, how many, the item it is stowed in (none when carried loose) and the
 * player's name for it. Worn, held and invested arrive with #472.
 */
export const InventoryItemSchema = z.strictObject({
  id: InventoryItemId,
  item: ContentId,
  quantity: ItemQuantity,
  container: InventoryItemId.optional(),
  name: InventoryItemName.optional(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export const INVENTORY_ITEMS_MAX = 500;

/** The item ids that hold `id`, innermost first; stops at a loop, which `InventorySchema` refuses. */
function containersOf(items: ReadonlyMap<InventoryItemId, InventoryItem>, id: InventoryItemId): InventoryItemId[] {
  const chain: InventoryItemId[] = [];
  let current = items.get(id)?.container;
  while (current !== undefined && !chain.includes(current)) {
    chain.push(current);
    current = items.get(current)?.container;
  }
  return chain;
}

function byId(items: readonly InventoryItem[]): ReadonlyMap<InventoryItemId, InventoryItem> {
  return new Map(items.map((each) => [each.id, each]));
}

/** Items with unique ids, each stowed in another item of the list, and never inside itself. */
const Items = z
  .array(InventoryItemSchema)
  .max(INVENTORY_ITEMS_MAX)
  .readonly()
  .check((context) => {
    const items = byId(context.value);
    if (items.size !== context.value.length) {
      context.issues.push({ code: 'custom', input: context.value, message: 'Duplicate inventory item id' });
    }
    for (const [index, { id, container }] of context.value.entries()) {
      if (container !== undefined && !items.has(container)) {
        context.issues.push({ code: 'custom', input: container, path: [index, 'container'], message: 'No such item' });
      } else if (containersOf(items, id).includes(id)) {
        context.issues.push({ code: 'custom', input: container, path: [index, 'container'], message: 'Inside itself' });
      }
    }
  });

/** What the character carries: items and coins. Bulk, wielding and runes are worked out or added by #472-#474. */
export const InventorySchema = z.strictObject({
  items: Items.default([]),
  coins: CoinsSchema.default(CoinsSchema.parse({})),
});
export type Inventory = z.infer<typeof InventorySchema>;

export const EMPTY_INVENTORY: Inventory = InventorySchema.parse({});

/** An item to add, with the id the server gave it. */
export interface NewItem {
  readonly id: InventoryItemId;
  readonly item: ContentId;
  readonly quantity: ItemQuantity;
  readonly container: InventoryItemId | undefined;
}

/** `inventory` with `added` appended. */
export function addItem(inventory: Inventory, { id, item, quantity, container }: NewItem): Inventory {
  const line: InventoryItem = container === undefined ? { id, item, quantity } : { id, item, quantity, container };
  return { ...inventory, items: [...inventory.items, line] };
}

/** `inventory` without `id`. What it held moves out to where it was, so nothing inside is lost. */
export function removeItem(inventory: Inventory, id: InventoryItemId): Inventory {
  const removed = inventory.items.find((each) => each.id === id);
  if (removed === undefined) {
    return inventory;
  }
  const items = inventory.items
    .filter((each) => each.id !== id)
    .map((each) => (each.container === id ? withContainer(each, removed.container) : each));
  return { ...inventory, items };
}

function withContainer(item: InventoryItem, container: InventoryItemId | undefined): InventoryItem {
  const { container: _old, ...rest } = item;
  return container === undefined ? rest : { ...rest, container };
}

function withName(item: InventoryItem, name: InventoryItemName | undefined): InventoryItem {
  const { name: _old, ...rest } = item;
  return name === undefined ? rest : { ...rest, name };
}

function updateItem(
  inventory: Inventory,
  id: InventoryItemId,
  change: (item: InventoryItem) => InventoryItem,
): Inventory {
  return { ...inventory, items: inventory.items.map((each) => (each.id === id ? change(each) : each)) };
}

export function setItemQuantity(inventory: Inventory, id: InventoryItemId, quantity: ItemQuantity): Inventory {
  return updateItem(inventory, id, (item) => ({ ...item, quantity }));
}

/** `id` stowed in `container`, or carried loose when it is undefined. */
export function moveItem(inventory: Inventory, id: InventoryItemId, container: InventoryItemId | undefined): Inventory {
  return updateItem(inventory, id, (item) => withContainer(item, container));
}

/** `id` with the player's `name`, or back to the content's name when it is undefined. */
export function renameItem(inventory: Inventory, id: InventoryItemId, name: InventoryItemName | undefined): Inventory {
  return updateItem(inventory, id, (item) => withName(item, name));
}

/** An inventory edit, as the refusal reads it: the item it changes and the container it puts something in. */
export interface InventoryEdit {
  readonly id?: InventoryItemId | undefined;
  /** The content an added item is. */
  readonly item?: ContentId | undefined;
  readonly container?: InventoryItemId | undefined;
}

/** The part of an inventory edit a refusal blames. */
export const InventoryRefusalField = { Id: 'id', Item: 'item', Container: 'container' } as const;
export type InventoryRefusalField = ValueOf<typeof InventoryRefusalField>;

/** Why an inventory edit is refused, and the patch field it blames. */
export interface InventoryRefusal {
  readonly field: InventoryRefusalField;
  readonly message: MessageDescriptor;
}

/**
 * Refuses an item added to a full inventory, an edit to an item the inventory hasn't, a move into an item it hasn't, and a move of an item into itself or
 * into something it holds. Which items can hold others is content's to say (`itemRefusal`).
 */
export function inventoryRefusal(
  inventory: Inventory,
  { id, item, container }: InventoryEdit,
): InventoryRefusal | undefined {
  if (item !== undefined && inventory.items.length >= INVENTORY_ITEMS_MAX) {
    return {
      field: InventoryRefusalField.Item,
      message: message('character.validation.inventoryFull', { maximum: INVENTORY_ITEMS_MAX }),
    };
  }
  const items = byId(inventory.items);
  if (id !== undefined && !items.has(id)) {
    return { field: InventoryRefusalField.Id, message: message('character.validation.itemNotFound') };
  }
  if (container === undefined) {
    return undefined;
  }
  if (!items.has(container)) {
    return { field: InventoryRefusalField.Container, message: message('character.validation.containerNotFound') };
  }
  if (id !== undefined && (container === id || containersOf(items, container).includes(id))) {
    return { field: InventoryRefusalField.Container, message: message('character.validation.containerInsideItself') };
  }
  return undefined;
}
