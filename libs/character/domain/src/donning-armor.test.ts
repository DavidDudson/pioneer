import { describe, expect, test } from 'bun:test';

import { ActionCost, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { readyDonningCost } from './donning-armor';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { itemContent } from './inventory-content';
import { runeContent } from './item-runes';
import { etchRune } from './rune-edits';
import { ItemFixture, itemFixtureId, itemFixtureRegistry, RuneFixture, runeFixtureId } from './testing';

installRulesFakes();

const registry = itemFixtureRegistry();
const items = itemContent(registry);
const runes = runeContent(registry);
const ARMOUR = InventoryItemId.parse('00000000-0000-4000-8000-000000000002');

/** The armour `item`, with `rune` etched on it when given. */
function armour(item: ItemFixture, rune: RuneFixture | undefined): InventoryItem {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: ARMOUR,
    item: itemFixtureId(item),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });

  if (rune !== undefined) {
    inventory = etchRune(inventory, ARMOUR, { type: RuneType.Property, rune: runeFixtureId(rune) });
  }

  const [line] = inventory.items;

  if (line === undefined) {
    throw new Error('the armour was not added');
  }

  return line;
}

function cost(item: ItemFixture, rune: RuneFixture | undefined): string | undefined {
  return readyDonningCost(armour(item, rune), items.get(itemFixtureId(item)), runes);
}

describe('readyDonningCost', () => {
  test('a ready rune lets light armour be donned as a single action', () => {
    expect(cost(ItemFixture.LeatherArmor, RuneFixture.Ready)).toBe(ActionCost.One);
  });

  test('a ready rune makes donning medium armour a 2-action activity', () => {
    expect(cost(ItemFixture.HideArmor, RuneFixture.Ready)).toBe(ActionCost.Two);
  });

  test('a greater ready rune lets any armour be donned as a single action', () => {
    expect(cost(ItemFixture.LeatherArmor, RuneFixture.ReadyGreater)).toBe(ActionCost.One);
    expect(cost(ItemFixture.HideArmor, RuneFixture.ReadyGreater)).toBe(ActionCost.One);
  });

  test('armour without a ready rune, and items that are not armour, have no cost', () => {
    expect(cost(ItemFixture.HideArmor, undefined)).toBeUndefined();
    expect(cost(ItemFixture.Longsword, undefined)).toBeUndefined();
  });
});
