import { describe, expect, test } from 'bun:test';

import { BulkTenths, FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { coatingBulk, CoatingProblem, coatingRefusal } from './coating';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { itemContent } from './inventory-content';
import { setItemState } from './inventory-state';
import { runeContent } from './item-runes';
import { etchRune } from './rune-edits';
import { fundamental, ItemFixture, itemFixtureId, itemFixtureRegistry, RuneFixture, runeFixtureId } from './testing';

installRulesFakes();
const registry = itemFixtureRegistry();
const reads = { items: itemContent(registry), runes: runeContent(registry) };
const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const OIL = itemFixtureId(ItemFixture.WeaponOil);
const HEAVY_OIL = itemFixtureId(ItemFixture.HeavyOil);
const POISON = itemFixtureId(ItemFixture.InjuryPoison);

/** A +1 longsword, with a coating rune when `coated`, holding `stored`. */
function sword(coated: boolean, stored: readonly (typeof OIL)[] = []): InventoryItem {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Potency, 1));
  if (coated) {
    inventory = etchRune(inventory, SWORD, { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Coating) });
  }
  inventory = setItemState(inventory, SWORD, { coating: stored });
  const [line] = inventory.items;
  if (line === undefined) {
    throw new Error('the sword was not added');
  }
  return line;
}

describe('coating rune', () => {
  test('takes an oil and an injury poison', () => {
    expect(coatingRefusal(sword(true), OIL, reads)).toBeUndefined();
    expect(coatingRefusal(sword(true), POISON, reads)).toBeUndefined();
  });

  test('refuses what is no poison or oil that fits a weapon', () => {
    const potion = itemFixtureId(ItemFixture.HealingPotion);

    expect(coatingRefusal(sword(true), potion, reads)).toBe(CoatingProblem.NotPoisonOrOil);
  });

  test('refuses a weapon with no coating rune', () => {
    expect(coatingRefusal(sword(false), OIL, reads)).toBe(CoatingProblem.NoRune);
  });

  test('holds up to 1 Bulk', () => {
    expect(coatingBulk([OIL, POISON], reads.items)).toBe(BulkTenths.parse(2));
    expect(coatingRefusal(sword(true, [HEAVY_OIL]), OIL, reads)).toBe(CoatingProblem.TooMuchBulk);
    expect(coatingRefusal(sword(true, [OIL]), HEAVY_OIL, reads)).toBe(CoatingProblem.TooMuchBulk);
  });

  test('a line whose space is emptied keeps no state', () => {
    expect(sword(true, []).state).toBeUndefined();
    expect(sword(true, [OIL]).state).toStrictEqual({ coating: [OIL] });
  });
});
