import { describe, expect, test } from 'bun:test';

import {
  addItem,
  carryItem,
  EMPTY_INVENTORY,
  InventoryItemId,
  inventoryRefusal,
  InventoryRefusalField,
  InventorySchema,
  investItem,
  ItemQuantity,
  moveItem,
  removeItem,
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
