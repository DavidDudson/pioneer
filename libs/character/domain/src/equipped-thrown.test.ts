import { describe, expect, test } from 'bun:test';

import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { equippedInputs } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

installRulesFakes();
const content = itemFixtureContent();
const ONE_HANDED: Carry = { state: CarryState.Held, hands: ONE_HAND };
const STACK = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

/** An inventory of `quantity` of `fixture`, held in one hand. */
function holding(fixture: ItemFixture, quantity: number): Inventory {
  const stock = addItem(EMPTY_INVENTORY, {
    id: STACK,
    item: itemFixtureId(fixture),
    quantity: ItemQuantity.parse(quantity),
    container: undefined,
  });
  return carryItem(stock, STACK, ONE_HANDED);
}

describe('equippedInputs of thrown consumables', () => {
  test('a held stack of bombs is one Strike with its splash, persistent damage, range and stack size', () => {
    const inputs = equippedInputs(holding(ItemFixture.AlchemistsFire, 3), content);
    expect(inputs.weapons).toHaveLength(1);
    expect(inputs.weapons[0]).toMatchObject({
      range: 20,
      splash: 1,
      quantity: 3,
      damage: { dice: 1, die: 'd8', damageType: 'fire', persistent: { formula: '1', damageType: 'fire' } },
    });
  });

  test('thrown holy water is a Strike of its own damage type with its splash', () => {
    const [water] = equippedInputs(holding(ItemFixture.HolyWater, 2), content).weapons;
    expect(water).toMatchObject({ range: 20, splash: 1, quantity: 2, damage: { damageType: 'spirit' } });
  });

  test('a weapon that is not a consumable has no stack size', () => {
    const inputs = equippedInputs(holding(ItemFixture.Longsword, 1), content);
    expect(inputs.weapons[0]?.quantity).toBeUndefined();
    expect(inputs.weapons[0]?.splash).toBeUndefined();
  });
});
