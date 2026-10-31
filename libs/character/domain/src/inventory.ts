import { ContentId } from '@pioneer/rules/sdk';
import { message, Pg, Uuid } from '@pioneer/shared/kernel';
import type { MessageDescriptor, ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CoinsSchema } from './coins';
import { movedOut, withContainer, withName } from './inventory-line-edits';
import { CarrySchema, CarryState, handsInUse, investedCount, STOWED } from './item-carry';
import type { Carry } from './item-carry';
import { ItemOrigin, playerLimits } from './item-origin';
import { KeyItemId } from './key-item-id';
import { CORE_RULE_LIMITS } from './rule-limits';
import type { RuleLimits } from './rule-limits';
import { ItemRunesSchema } from './rune-etching';

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

/**
 * An item the character has: the content it is, how many, the item it is stowed in (none when carried loose), the
 * player's name for it, how it is carried, whether it is invested, whether it is broken, and the runes etched onto it.
 * An invested item stays invested while it is off, but only works while it is worn or held as it is used
 * (`activeState`). A broken item stays broken, through daily preparations too, until the player marks it repaired.
 * A line with no `origin` is the player's; an `import` line is kept as imported, however far it is past the limits.
 * A line with a `keyItem` is the holder's copy of a campaign's key item: the GM gave it, so it is kept as given, never
 * held to the limits or flagged, and the player cannot remove or sell it.
 */
export const InventoryItemSchema = z.strictObject({
  id: InventoryItemId,
  item: ContentId,
  quantity: ItemQuantity,
  container: InventoryItemId.optional(),
  name: InventoryItemName.optional(),
  carry: CarrySchema.default(STOWED),
  invested: z.literal(true).optional(),
  broken: z.literal(true).optional(),
  runes: ItemRunesSchema.optional(),
  origin: z.literal(ItemOrigin.Import).optional(),
  keyItem: KeyItemId.optional(),
});
export type InventoryItem = z.infer<typeof InventoryItemSchema>;

export { CoinAmount, CoinsSchema } from './coins';
export type { Coins } from './coins';

export const INVENTORY_ITEMS_MAX = CORE_RULE_LIMITS.itemsMax;

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

/**
 * Items with unique ids, each stowed in another item of the list and never inside itself. The player's lines are held
 * to the core limits (`playerLimits`); imported lines are not.
 */
const Items = z
  .array(InventoryItemSchema)
  .max(INVENTORY_ITEMS_MAX)
  .readonly()
  .check((context) => {
    const items = byId(context.value);
    if (items.size !== context.value.length) {
      context.issues.push({ code: 'custom', input: context.value, message: 'Duplicate inventory item id' });
    }
    for (const [index, { id, container, carry }] of context.value.entries()) {
      if (container !== undefined && !items.has(container)) {
        context.issues.push({ code: 'custom', input: container, path: [index, 'container'], message: 'No such item' });
      } else if (containersOf(items, id).includes(id)) {
        context.issues.push({ code: 'custom', input: container, path: [index, 'container'], message: 'Inside itself' });
      }
      if (container !== undefined && carry.state !== CarryState.Stowed) {
        context.issues.push({ code: 'custom', input: carry, path: [index, 'carry'], message: 'In a container' });
      }
    }
  })
  .check(playerLimits);

/**
 * An item an import found no content for, kept by the name Pathbuilder gave it: a name and how many, weighing nothing.
 * It is never dropped, and the player removes it (`removeItem`) once they replace it with a content item or no longer
 * carry it (#310 feat(interop): import Pathbuilder inventory, runes and coins).
 */
export const CustomItemSchema = z.strictObject({
  id: InventoryItemId,
  name: InventoryItemName,
  quantity: ItemQuantity,
  origin: z.literal(ItemOrigin.Import),
});
export type CustomItem = z.infer<typeof CustomItemSchema>;

/** What the character carries: items, the custom items an import kept, and coins. Bulk is worked out on every read (`inventoryBulk`). */
export const InventorySchema = z.strictObject({
  items: Items.default([]),
  customItems: z.array(CustomItemSchema).max(INVENTORY_ITEMS_MAX).readonly().default([]),
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

/** `inventory` with `added` appended, stowed. */
export function addItem(inventory: Inventory, { id, item, quantity, container }: NewItem): Inventory {
  const line: InventoryItem =
    container === undefined ? { id, item, quantity, carry: STOWED } : { id, item, quantity, container, carry: STOWED };
  return { ...inventory, items: [...inventory.items, line] };
}

/**
 * `inventory` without `id`. What it held moves out to where it was, so nothing inside is lost: onto the ground when
 * the container lay there.
 */
export function removeItem(inventory: Inventory, id: InventoryItemId): Inventory {
  const removed = inventory.items.find((each) => each.id === id);
  if (removed === undefined) {
    return { ...inventory, customItems: inventory.customItems.filter((each) => each.id !== id) };
  }
  const dropped = removed.carry.state === CarryState.Dropped;
  const items = inventory.items
    .filter((each) => each.id !== id)
    .map((each) => (each.container === id ? movedOut(each, removed.container, dropped) : each));
  return { ...inventory, items };
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

/** `id` stowed in `container`, or stowed loose when it is undefined. */
export function moveItem(inventory: Inventory, id: InventoryItemId, container: InventoryItemId | undefined): Inventory {
  return updateItem(inventory, id, (item) => ({ ...withContainer(item, container), carry: STOWED }));
}

/** `id` carried as `carry`. Worn, held or dropped, it comes out of its container; stowed, it stays where it is. */
export function carryItem(inventory: Inventory, id: InventoryItemId, carry: Carry): Inventory {
  return updateItem(inventory, id, (item) => ({
    ...(carry.state === CarryState.Stowed ? item : withContainer(item, undefined)),
    carry,
  }));
}

/** `id` invested, or no longer invested. */
export function investItem(inventory: Inventory, id: InventoryItemId, invested: boolean): Inventory {
  return updateItem(inventory, id, (item) => {
    const { invested: _old, ...rest } = item;
    return invested ? { ...rest, invested } : rest;
  });
}

/** `id` with the player's `name`, or back to the content's name when it is undefined. */
export function renameItem(inventory: Inventory, id: InventoryItemId, name: InventoryItemName | undefined): Inventory {
  return updateItem(inventory, id, (item) => withName(item, name));
}

/**
 * An inventory edit, as the refusal reads it: the item it changes, the item or kit it adds, the container it puts
 * something in, how it carries the item and whether it invests it.
 */
export interface InventoryEdit {
  readonly id?: InventoryItemId | undefined;
  /** The content an added item is. */
  readonly item?: ContentId | undefined;
  /** The kit whose items an edit adds. */
  readonly kit?: ContentId | undefined;
  readonly container?: InventoryItemId | undefined;
  readonly carry?: Carry | undefined;
  readonly invested?: boolean | undefined;
  /** The item a transferred rune moves onto. */
  readonly to?: InventoryItemId | undefined;
}

/** The part of an inventory edit a refusal blames. */
export const InventoryRefusalField = {
  Id: 'id',
  Item: 'item',
  /** The kit an edit adds. */
  Kit: 'kit',
  Container: 'container',
  Carry: 'carry',
  Invested: 'invested',
  Rune: 'rune',
  To: 'to',
} as const;
export type InventoryRefusalField = ValueOf<typeof InventoryRefusalField>;

/** Why an inventory edit is refused, and the patch field it blames. */
export interface InventoryRefusal {
  readonly field: InventoryRefusalField;
  readonly message: MessageDescriptor;
}

/**
 * Refuses an item or kit added to a full inventory, an edit to an item the inventory hasn't (or a rune moved onto one), holding more than two hands
 * hold, investing past the limit, a move into an item the inventory hasn't, and a move of an item into itself or into
 * something it holds. Which items can hold others, be worn or be invested is content's to say (`itemRefusal`).
 */
export function inventoryRefusal(
  inventory: Inventory,
  edit: InventoryEdit,
  limits: RuleLimits = CORE_RULE_LIMITS,
): InventoryRefusal | undefined {
  const { id, item, kit } = edit;
  const adds = item !== undefined || kit !== undefined;
  if (adds && inventory.items.length >= limits.itemsMax) {
    return {
      field: kit === undefined ? InventoryRefusalField.Item : InventoryRefusalField.Kit,
      message: message('character.validation.inventoryFull', { maximum: limits.itemsMax }),
    };
  }
  const items = byId(inventory.items);
  if (id !== undefined && !items.has(id)) {
    return { field: InventoryRefusalField.Id, message: message('character.validation.itemNotFound') };
  }
  if (edit.to !== undefined && !items.has(edit.to)) {
    return { field: InventoryRefusalField.To, message: message('character.validation.itemNotFound') };
  }
  return limitRefusal(inventory, edit, limits) ?? containerRefusal(items, edit);
}

/** Refuses holding more than two hands hold, and investing an item past the limit. */
function limitRefusal(
  inventory: Inventory,
  { id, carry, invested }: InventoryEdit,
  limits: RuleLimits,
): InventoryRefusal | undefined {
  const others = inventory.items.filter((each) => each.id !== id);
  if (carry?.state === CarryState.Held && handsInUse(others) + carry.hands > limits.handsMax) {
    return {
      field: InventoryRefusalField.Carry,
      message: message('character.validation.handsFull', { maximum: limits.handsMax }),
    };
  }
  if (invested === true && investedCount(others) >= limits.investedMax) {
    return {
      field: InventoryRefusalField.Invested,
      message: message('character.validation.investmentFull', { maximum: limits.investedMax }),
    };
  }
  return undefined;
}

/** Refuses a move into an item the inventory hasn't, and into the item itself or something it holds. */
function containerRefusal(
  items: ReadonlyMap<InventoryItemId, InventoryItem>,
  { id, container }: InventoryEdit,
): InventoryRefusal | undefined {
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
