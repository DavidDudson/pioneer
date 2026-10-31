import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { equippedInputs } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import { itemSlugs, ownedItems } from './owned-items';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

installRulesFakes();
const content = itemFixtureContent();
const one = ItemQuantity.parse(1);

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

/** An inventory of `items`, the nth with id `idAt(n)`, the first held in one hand. */
function carrying(...items: readonly ItemFixture[]): Inventory {
  let stock = EMPTY_INVENTORY;
  for (const [index, name] of items.entries()) {
    stock = addItem(stock, { id: idAt(index), item: itemFixtureId(name), quantity: one, container: undefined });
  }
  return carryItem(stock, idAt(0), { state: CarryState.Held, hands: ONE_HAND });
}

describe('owned items', () => {
  test('a weapon is named as its Strike is, equipped or not, and a second of it is told apart', () => {
    const stock = carrying(ItemFixture.Longsword, ItemFixture.Longsword, ItemFixture.SteelShield);

    expect([...itemSlugs(stock, content).values()].map(String)).toEqual(['longsword', 'longsword-2', 'steel-shield']);
  });

  test('a stowed twin takes the first name, so the held one keeps the same name whatever it is carrying', () => {
    const stock = carryItem(carrying(ItemFixture.Longsword, ItemFixture.Longsword), idAt(0), {
      state: CarryState.Stowed,
    });
    const held = carryItem(stock, idAt(1), { state: CarryState.Held, hands: ONE_HAND });
    const [sword] = equippedInputs(held, content).weapons;

    expect(String(sword?.slug)).toBe('longsword-2');
    expect(ownedItems(stock, content).map(({ slug }) => String(slug))).toEqual(['longsword', 'longsword-2']);
  });

  test('an item reads as its kind, traits and whether it is equipped', () => {
    const [sword, shield] = ownedItems(carrying(ItemFixture.Longsword, ItemFixture.SteelShield), content);

    expect(sword?.rollOptions.map(String)).toContain('type:weapon');
    expect(sword?.rollOptions.map(String)).toContain('equipped');
    expect(shield?.rollOptions.map(String)).toContain('type:shield');
    expect(shield?.rollOptions.map(String)).not.toContain('equipped');
  });
});
