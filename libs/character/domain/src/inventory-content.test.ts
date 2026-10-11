import { describe, expect, test } from 'bun:test';

import { ContentId } from '@pioneer/rules/sdk';

import { addItem, EMPTY_INVENTORY, InventoryItemId, InventoryRefusalField, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { isContainer, ItemPlacement, itemPlacement, itemRefusal } from './inventory-content';
import type { ItemEntry } from './inventory-content';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

const content = itemFixtureContent();
const backpackId = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const ropeId = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
const one = ItemQuantity.parse(1);

function entry(name: ItemFixture): ItemEntry | undefined {
  return content.get(itemFixtureId(name));
}

/** A loose backpack and a loose rope. */
const withBackpack = addItem(EMPTY_INVENTORY, {
  id: backpackId,
  item: itemFixtureId(ItemFixture.Backpack),
  quantity: one,
  container: undefined,
});
const carried: Inventory = addItem(withBackpack, {
  id: ropeId,
  item: itemFixtureId(ItemFixture.Rope),
  quantity: one,
  container: undefined,
});

describe('itemContent', () => {
  test('holds every carried kind', () => {
    expect(content.size).toBe(Object.keys(ItemFixture).length);
  });
});

describe('isContainer', () => {
  test('is equipment with a capacity', () => {
    expect(isContainer(entry(ItemFixture.Backpack))).toBe(true);
    expect(isContainer(entry(ItemFixture.Rope))).toBe(false);
    expect(isContainer(entry(ItemFixture.LeatherArmor))).toBe(false);
    expect(isContainer(undefined)).toBe(false);
  });
});

describe('itemRefusal', () => {
  test('allows a carried item into a container', () => {
    expect(itemRefusal(content, carried, { item: itemFixtureId(ItemFixture.Rope), container: backpackId })).toBe(
      undefined,
    );
  });

  test('refuses content no pack has', () => {
    const unknown = ContentId.parse('5b0e3c4a-0000-5000-8000-000000000000');
    expect(itemRefusal(content, carried, { item: unknown })).toMatchObject({
      field: InventoryRefusalField.Item,
      message: { key: 'character.validation.unknownItem' },
    });
  });

  test('refuses stowing in an item that holds nothing', () => {
    expect(itemRefusal(content, carried, { container: ropeId })).toMatchObject({
      field: InventoryRefusalField.Container,
      message: { key: 'character.validation.notAContainer' },
    });
  });
});

describe('itemPlacement', () => {
  test.each([
    [ItemFixture.LeatherArmor, ItemPlacement.Worn],
    [ItemFixture.Backpack, ItemPlacement.Worn],
    [ItemFixture.SteelShield, ItemPlacement.Held],
    [ItemFixture.Longsword, ItemPlacement.Held],
    [ItemFixture.HealingPotion, ItemPlacement.Held],
    [ItemFixture.Rope, ItemPlacement.Stowed],
    [ItemFixture.Diamond, ItemPlacement.Stowed],
  ])('carries %s loose as %s', (name, placement) => {
    expect(itemPlacement(entry(name), false)).toBe(placement);
  });

  test('stows anything inside a container, and content no pack has', () => {
    expect(itemPlacement(entry(ItemFixture.Longsword), true)).toBe(ItemPlacement.Stowed);
    expect(itemPlacement(undefined, false)).toBe(ItemPlacement.Stowed);
  });
});
