import { describe, expect, test } from 'bun:test';

import { Hardness, HitPoints } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { heldShields } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { ItemFixture, itemFixtureContent, itemFixtureId } from './testing';

installRulesFakes();
const content = itemFixtureContent();
const ID = InventoryItemId.parse('00000000-0000-4000-8000-000000000000');

/** An inventory of one `item`, carried as given. */
function carrying(item: ItemFixture, carry: Carry): Inventory {
  const stock = addItem(EMPTY_INVENTORY, {
    id: ID,
    item: itemFixtureId(item),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  return carryItem(stock, ID, carry);
}

describe('heldShields', () => {
  test('a held shield gives its Hardness, Hit Points and a Broken Threshold of half its Hit Points', () => {
    const held = carrying(ItemFixture.SteelShield, { state: CarryState.Held, hands: ONE_HAND });

    expect(heldShields(held, content)).toStrictEqual([
      {
        entry: itemFixtureId(ItemFixture.SteelShield),
        hardness: Hardness.parse(5),
        hitPoints: HitPoints.parse(20),
        brokenThreshold: HitPoints.parse(10),
      },
    ]);
  });

  test('a stowed shield gives none', () => {
    expect(heldShields(carrying(ItemFixture.SteelShield, { state: CarryState.Stowed }), content)).toStrictEqual([]);
  });

  test('a held weapon is no shield', () => {
    const held = carrying(ItemFixture.Longsword, { state: CarryState.Held, hands: ONE_HAND });

    expect(heldShields(held, content)).toStrictEqual([]);
  });
});
