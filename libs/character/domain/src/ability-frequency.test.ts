import { describe, expect, test } from 'bun:test';

import { FundamentalRune, RuneType, Slug } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { itemActivationsOf } from './ability-frequency';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory, InventoryItem } from './inventory';
import { etchRune } from './rune-edits';
import { fundamental, ItemFixture, itemFixtureId, itemFixtureRegistry, RuneFixture, runeFixtureId } from './testing';

installRulesFakes();

const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const ARMOR = InventoryItemId.parse('00000000-0000-4000-8000-000000000002');
const HOLY_HEALING = Slug.parse('holy-healing');
const GO_INVISIBLE = Slug.parse('go-invisible');
const TAKE_TO_THE_SKIES = Slug.parse('take-to-the-skies');

/** The inventory line of a longsword with a +1 potency rune and `runes` etched onto it. */
function sword(...runes: ReadonlyArray<RuneFixture>): InventoryItem {
  let inventory: Inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });

  inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Potency, 1));

  for (const rune of runes) {
    inventory = etchRune(inventory, SWORD, { type: RuneType.Property, rune: runeFixtureId(rune) });
  }

  const [line] = inventory.items;

  if (line === undefined) {
    throw new Error('the sword was not added');
  }

  return line;
}

/** The inventory line of leather armour with a +1 potency rune and `runes` etched onto it. */
function armor(...runes: ReadonlyArray<RuneFixture>): InventoryItem {
  let inventory: Inventory = addItem(EMPTY_INVENTORY, {
    id: ARMOR,
    item: itemFixtureId(ItemFixture.LeatherArmor),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });

  inventory = etchRune(inventory, ARMOR, fundamental(FundamentalRune.Potency, 1));

  for (const rune of runes) {
    inventory = etchRune(inventory, ARMOR, { type: RuneType.Property, rune: runeFixtureId(rune) });
  }

  const [line] = inventory.items;

  if (line === undefined) {
    throw new Error('the armour was not added');
  }

  return line;
}

describe('item activations', () => {
  const activationsOf = itemActivationsOf(itemFixtureRegistry());

  test('a weapon gives the activations of the property runes etched onto it', () => {
    expect(activationsOf(sword(RuneFixture.Holy)).map(({ slug }) => slug)).toStrictEqual([HOLY_HEALING]);
  });

  test('a weapon with no rune that has an activation gives none', () => {
    expect(activationsOf(sword(RuneFixture.Frost))).toStrictEqual([]);
    expect(activationsOf(sword())).toStrictEqual([]);
  });

  test('a rune past the room its potency gives does not work, so gives no activation', () => {
    expect(activationsOf(sword(RuneFixture.Frost, RuneFixture.Holy))).toStrictEqual([]);
  });

  test('armour gives the activations of the property runes etched onto it, a daily and an hourly one', () => {
    expect(activationsOf(armor(RuneFixture.Invisibility)).map(({ slug }) => slug)).toStrictEqual([GO_INVISIBLE]);
    expect(activationsOf(armor(RuneFixture.Winged)).map(({ slug }) => slug)).toStrictEqual([TAKE_TO_THE_SKIES]);
  });

  test('armour with no rune that has an activation gives none', () => {
    expect(activationsOf(armor(RuneFixture.Shadow))).toStrictEqual([]);
    expect(activationsOf(armor())).toStrictEqual([]);
  });

  test('an armour rune past the room its potency gives does not work, so gives no activation', () => {
    expect(activationsOf(armor(RuneFixture.Shadow, RuneFixture.Winged))).toStrictEqual([]);
  });
});
