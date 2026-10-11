import { describe, expect, test } from 'bun:test';

import {
  addItem,
  carryItem,
  CoinAmount,
  EMPTY_INVENTORY,
  INVENTORY_ITEMS_MAX,
  InventoryItemId,
  InventoryItemName,
  inventoryRefusal,
  InventoryRefusalField,
  InventorySchema,
  investItem,
  ItemQuantity,
  moveItem,
  removeItem,
  renameItem,
  setItemQuantity,
} from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import {
  CarryState,
  Hands,
  HANDS_MAX,
  handsInUse,
  InvestedCount,
  INVESTED_MAX,
  investedCount,
  ONE_HAND,
  STOWED,
} from './item-carry';
import type { Carry } from './item-carry';
import { ItemFixture, itemFixtureId } from './testing';

const backpackId = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const pouchId = InventoryItemId.parse('22222222-2222-4222-8222-222222222222');
const ropeId = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
const missingId = InventoryItemId.parse('99999999-9999-4999-8999-999999999999');
const one = ItemQuantity.parse(1);

/** A backpack holding a pouch holding a rope. */
function packed(): Inventory {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: backpackId,
    item: itemFixtureId(ItemFixture.Backpack),
    quantity: one,
    container: undefined,
  });
  inventory = addItem(inventory, {
    id: pouchId,
    item: itemFixtureId(ItemFixture.Backpack),
    quantity: one,
    container: backpackId,
  });
  return addItem(inventory, { id: ropeId, item: itemFixtureId(ItemFixture.Rope), quantity: one, container: pouchId });
}

function containerOf(inventory: Inventory, id: InventoryItemId): InventoryItemId | undefined {
  return inventory.items.find((each) => each.id === id)?.container;
}

describe('InventorySchema', () => {
  test('reads an empty inventory as no items and no coins', () => {
    expect(InventorySchema.parse({})).toStrictEqual(EMPTY_INVENTORY);
    expect(Object.values(EMPTY_INVENTORY.coins).every((count) => count === CoinAmount.parse(0))).toBe(true);
  });

  test('keeps nested containers', () => {
    expect(InventorySchema.parse(packed())).toStrictEqual(packed());
  });

  test('refuses an item stowed in one missing from the inventory', () => {
    const lost = { items: [{ id: ropeId, item: itemFixtureId(ItemFixture.Rope), quantity: 1, container: missingId }] };
    expect(InventorySchema.safeParse(lost).success).toBe(false);
  });

  test('refuses containers that hold each other', () => {
    const backpack = itemFixtureId(ItemFixture.Backpack);
    const loop = {
      items: [
        { id: backpackId, item: backpack, quantity: 1, container: pouchId },
        { id: pouchId, item: backpack, quantity: 1, container: backpackId },
      ],
    };
    expect(InventorySchema.safeParse(loop).success).toBe(false);
  });

  test('refuses two items with one id', () => {
    const rope = { id: ropeId, item: itemFixtureId(ItemFixture.Rope), quantity: 1 };
    expect(InventorySchema.safeParse({ items: [rope, rope] }).success).toBe(false);
  });

  test('refuses negative coins', () => {
    expect(InventorySchema.safeParse({ coins: { gp: -1 } }).success).toBe(false);
  });
});

describe('inventory edits', () => {
  test('removing a container moves what it held out to where it was', () => {
    const inventory = removeItem(packed(), pouchId);
    expect(inventory.items.map((each) => each.id)).toStrictEqual([backpackId, ropeId]);
    expect(containerOf(inventory, ropeId)).toBe(backpackId);
  });

  test('removing a loose container leaves what it held loose', () => {
    const inventory = removeItem(packed(), backpackId);
    expect(containerOf(inventory, pouchId)).toBeUndefined();
    expect(containerOf(inventory, ropeId)).toBe(pouchId);
  });

  test('moving out of a container leaves the item loose', () => {
    const inventory = moveItem(packed(), ropeId, undefined);
    expect(containerOf(inventory, ropeId)).toBeUndefined();
  });

  test('sets a quantity on one item only', () => {
    const inventory = setItemQuantity(packed(), ropeId, ItemQuantity.parse(3));
    expect(inventory.items.map((each) => each.quantity)).toStrictEqual([one, one, ItemQuantity.parse(3)]);
  });

  test('renames an item and clears the name back to the content name', () => {
    const name = InventoryItemName.parse("  Grandfather's rope ");
    const named = renameItem(packed(), ropeId, name);
    expect(named.items.find((each) => each.id === ropeId)?.name).toBe(InventoryItemName.parse("Grandfather's rope"));
    expect(renameItem(named, ropeId, undefined).items.find((each) => each.id === ropeId)).not.toHaveProperty('name');
  });
});

describe('inventoryRefusal', () => {
  test('refuses an item added to a full inventory, naming the limit', () => {
    let full = EMPTY_INVENTORY;
    for (let index = 0; index < INVENTORY_ITEMS_MAX; index += 1) {
      const id = InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
      full = addItem(full, { id, item: itemFixtureId(ItemFixture.Rope), quantity: one, container: undefined });
    }
    expect(inventoryRefusal(full, { item: itemFixtureId(ItemFixture.Rope) })).toMatchObject({
      field: InventoryRefusalField.Item,
      message: { key: 'character.validation.inventoryFull', params: { maximum: INVENTORY_ITEMS_MAX } },
    });
    expect(inventoryRefusal(packed(), { item: itemFixtureId(ItemFixture.Rope) })).toBeUndefined();
  });

  test('allows an edit to an item the inventory has', () => {
    expect(inventoryRefusal(packed(), { id: ropeId, container: backpackId })).toBeUndefined();
  });

  test('refuses an item missing from the inventory', () => {
    expect(inventoryRefusal(packed(), { id: missingId })).toMatchObject({ field: InventoryRefusalField.Id });
  });

  test('refuses a container missing from the inventory', () => {
    expect(inventoryRefusal(packed(), { container: missingId })).toMatchObject({
      field: InventoryRefusalField.Container,
      message: { key: 'character.validation.containerNotFound' },
    });
  });

  test.each([
    ['itself', backpackId],
    ['something it holds', pouchId],
    ['something inside what it holds', ropeId],
  ])('refuses moving a container into %s', (_case, container) => {
    expect(inventoryRefusal(packed(), { id: backpackId, container })).toMatchObject({
      field: InventoryRefusalField.Container,
      message: { key: 'character.validation.containerInsideItself' },
    });
  });

  test('leaves which items can hold others to content', () => {
    expect(inventoryRefusal(packed(), { container: ropeId })).toBeUndefined();
  });
});

const BOTH_HANDS = Hands.parse(2);
const WORN: Carry = { state: CarryState.Worn };
const DROPPED: Carry = { state: CarryState.Dropped };
const ONE_HANDED: Carry = { state: CarryState.Held, hands: ONE_HAND };
const TWO_HANDED: Carry = { state: CarryState.Held, hands: BOTH_HANDS };

function carryOf(inventory: Inventory, id: InventoryItemId): Carry | undefined {
  return inventory.items.find((each) => each.id === id)?.carry;
}

function ropeIdAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

/** `count` loose ropes, the nth with id `ropeIdAt(n)`, each changed by `change` when given. */
function ropes(count: number, change: (item: InventoryItem) => InventoryItem = (item) => item): Inventory {
  const items: InventoryItem[] = [];
  for (let index = 0; index < count; index += 1) {
    items.push(change({ id: ropeIdAt(index), item: itemFixtureId(ItemFixture.Rope), quantity: one, carry: STOWED }));
  }
  return { ...EMPTY_INVENTORY, items };
}

describe('carrying', () => {
  test('a new item is stowed', () => {
    expect(packed().items.map(({ carry }) => carry)).toStrictEqual([STOWED, STOWED, STOWED]);
  });

  test.each([WORN, DROPPED, ONE_HANDED])('carried %o, an item comes out of its container', (carry) => {
    const carried = carryItem(packed(), ropeId, carry);
    expect(containerOf(carried, ropeId)).toBe(undefined);
    expect(carryOf(carried, ropeId)).toStrictEqual(carry);
    expect(InventorySchema.safeParse(carried).success).toBe(true);
  });

  test('stowed, an item stays in its container', () => {
    const stowed = carryItem(packed(), ropeId, STOWED);
    expect(containerOf(stowed, ropeId)).toBe(pouchId);
  });

  test('moving an item into a container stows it', () => {
    const worn = carryItem(packed(), ropeId, WORN);
    expect(carryOf(moveItem(worn, ropeId, backpackId), ropeId)).toStrictEqual(STOWED);
  });

  test('removing a dropped container drops what it held', () => {
    const removed = removeItem(carryItem(packed(), backpackId, DROPPED), backpackId);
    expect(carryOf(removed, pouchId)).toStrictEqual(DROPPED);
    expect(InventorySchema.safeParse(removed).success).toBe(true);
  });

  test('counts the hands in use', () => {
    const holding = ropes(2, (item) => ({ ...item, carry: ONE_HANDED }));
    expect(handsInUse(holding.items)).toBe(BOTH_HANDS);
  });
});

describe('investing', () => {
  test('invests an item', () => {
    const invested = investItem(packed(), ropeId, true);
    expect(invested.items.find((each) => each.id === ropeId)?.invested).toBe(true);
    expect(investedCount(invested.items)).toBe(InvestedCount.parse(1));
  });

  test('takes investment off', () => {
    const off = investItem(investItem(packed(), ropeId, true), ropeId, false);
    expect(off.items.find((each) => each.id === ropeId)).not.toHaveProperty('invested');
  });
});

describe('inventoryRefusal: limits', () => {
  test('refuses holding more than two hands hold', () => {
    const holding = carryItem(ropes(2), ropeIdAt(0), TWO_HANDED);
    expect(inventoryRefusal(holding, { id: ropeIdAt(1), carry: ONE_HANDED })).toMatchObject({
      field: InventoryRefusalField.Carry,
      message: { key: 'character.validation.handsFull', params: { maximum: HANDS_MAX } },
    });
  });

  test('lets an item change the hands it is held in', () => {
    const holding = carryItem(ropes(1), ropeIdAt(0), TWO_HANDED);
    expect(inventoryRefusal(holding, { id: ropeIdAt(0), carry: ONE_HANDED })).toBe(undefined);
  });

  /** One more rope than the limit, every one invested but the last. */
  const full = ropes(INVESTED_MAX + 1, (item) =>
    item.id === ropeIdAt(INVESTED_MAX) ? item : { ...item, invested: true },
  );

  test('refuses an investment past the limit', () => {
    expect(inventoryRefusal(full, { id: ropeIdAt(INVESTED_MAX), invested: true })).toMatchObject({
      field: InventoryRefusalField.Invested,
      message: { key: 'character.validation.investmentFull', params: { maximum: INVESTED_MAX } },
    });
  });

  test('lets an invested item stay invested, and investment come off', () => {
    expect(inventoryRefusal(full, { id: ropeIdAt(0), invested: true })).toBe(undefined);
    expect(inventoryRefusal(full, { id: ropeIdAt(INVESTED_MAX), invested: false })).toBe(undefined);
  });
});

describe('InventorySchema: carrying', () => {
  test('reads an item without carry as stowed', () => {
    const read = InventorySchema.parse({ items: [{ id: ropeId, item: itemFixtureId(ItemFixture.Rope), quantity: 1 }] });
    expect(read.items[0]?.carry).toStrictEqual(STOWED);
  });

  test('refuses an item worn inside a container', () => {
    const wornRope = {
      id: ropeId,
      item: itemFixtureId(ItemFixture.Rope),
      quantity: one,
      container: pouchId,
      carry: WORN,
    };
    const items = [...packed().items.filter((each) => each.id !== ropeId), wornRope];
    expect(InventorySchema.safeParse({ ...packed(), items }).success).toBe(false);
  });

  test('refuses more held than two hands hold', () => {
    expect(InventorySchema.safeParse(ropes(2, (item) => ({ ...item, carry: TWO_HANDED }))).success).toBe(false);
  });

  test('refuses more invested than the limit', () => {
    expect(InventorySchema.safeParse(ropes(INVESTED_MAX + 1, (item) => ({ ...item, invested: true }))).success).toBe(
      false,
    );
  });
});
