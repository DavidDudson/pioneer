import { describe, expect, test } from 'bun:test';

import {
  addItem,
  CoinAmount,
  EMPTY_INVENTORY,
  INVENTORY_ITEMS_MAX,
  InventoryItemId,
  InventoryItemName,
  inventoryRefusal,
  InventoryRefusalField,
  InventorySchema,
  ItemQuantity,
  moveItem,
  removeItem,
  renameItem,
  setItemQuantity,
} from './inventory';
import type { Inventory } from './inventory';
import { ItemFixture, itemFixtureId, KitFixture, kitFixtureId } from './testing';

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
    expect(inventoryRefusal(full, { kit: kitFixtureId(KitFixture.Explorer) })).toMatchObject({
      field: InventoryRefusalField.Kit,
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
