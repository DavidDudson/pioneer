import { describe, expect, test } from 'bun:test';

import { ActionCost, ArmorItemCategory, ContentKind, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { readyDonningCost } from './donning-armor';
import type { ReadyDonningCost } from './donning-armor';
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

/** The armour `item`, with each of `etched` on it. */
function armour(item: ItemFixture, ...etched: readonly (RuneFixture | undefined)[]): InventoryItem {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: ARMOUR,
    item: itemFixtureId(item),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });

  for (const rune of etched) {
    if (rune !== undefined) {
      inventory = etchRune(inventory, ARMOUR, { type: RuneType.Property, rune: runeFixtureId(rune) });
    }
  }

  const [line] = inventory.items;

  if (line === undefined) {
    throw new Error('the armour was not added');
  }

  return line;
}

function cost(item: ItemFixture, rune: RuneFixture | undefined): ReadyDonningCost | undefined {
  return readyDonningCost(armour(item, rune), items.get(itemFixtureId(item)), runes);
}

/** The cost of `rune` on the leather armour, as if it were of `category`. */
function costAs(category: ArmorItemCategory, rune: RuneFixture): ReadyDonningCost | undefined {
  const base = items.get(itemFixtureId(ItemFixture.LeatherArmor));

  if (base?.kind !== ContentKind.Armor) {
    throw new Error('the leather armour is not armour');
  }

  return readyDonningCost(armour(ItemFixture.LeatherArmor, rune), { ...base, data: { ...base.data, category } }, runes);
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

  test.each([
    [ArmorItemCategory.Unarmored, ActionCost.One],
    [ArmorItemCategory.Heavy, ActionCost.Two],
    [ArmorItemCategory.LightBarding, undefined],
    [ArmorItemCategory.HeavyBarding, undefined],
  ])('a ready rune on %s armour costs %p', (category, expected) => {
    expect(costAs(category, RuneFixture.Ready)).toBe(expected);
  });

  test('a ready rune beside a greater one does not take the single action away', () => {
    const base = items.get(itemFixtureId(ItemFixture.HideArmor));
    const both = armour(ItemFixture.HideArmor, RuneFixture.Ready, RuneFixture.ReadyGreater);

    expect(readyDonningCost(both, base, runes)).toBe(ActionCost.One);
  });

  test('armour without a ready rune, and items that are not armour, have no cost', () => {
    expect(cost(ItemFixture.HideArmor, undefined)).toBeUndefined();
    expect(cost(ItemFixture.Longsword, undefined)).toBeUndefined();
  });
});
