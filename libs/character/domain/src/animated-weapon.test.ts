import { describe, expect, test } from 'bun:test';

import { FundamentalRune, Modifier, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { hasAnimatedRune, releasedAttack } from './animated-weapon';
import { addItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { itemContent } from './inventory-content';
import { setItemState } from './inventory-state';
import { runeContent } from './item-runes';
import { etchRune } from './rune-edits';
import { fundamental, ItemFixture, itemFixtureId, itemFixtureRegistry, RuneFixture, runeFixtureId } from './testing';

installRulesFakes();
const registry = itemFixtureRegistry();
const items = itemContent(registry);
const runes = runeContent(registry);
const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');

/** A longsword at `potency`, with an animated rune when `animated`, and set free when `released`. */
function sword(options: { potency: 1 | 2; animated: boolean; released: boolean }): InventoryItem {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Potency, options.potency));
  if (options.animated) {
    inventory = etchRune(inventory, SWORD, { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Animated) });
  }
  inventory = setItemState(inventory, SWORD, options.released ? { released: true } : {});
  const [line] = inventory.items;
  if (line === undefined) {
    throw new Error('the sword was not added');
  }
  return line;
}

describe('animated weapons', () => {
  const base = items.get(itemFixtureId(ItemFixture.Longsword));

  test('a weapon with the rune has it', () => {
    expect(hasAnimatedRune(sword({ potency: 1, animated: true, released: false }), base, runes)).toBe(true);
    expect(hasAnimatedRune(sword({ potency: 1, animated: false, released: false }), base, runes)).toBe(false);
  });

  test('a set-free weapon attacks at 24 plus its item bonus', () => {
    expect(releasedAttack(sword({ potency: 1, animated: true, released: true }), base, runes)).toBe(Modifier.parse(25));
    expect(releasedAttack(sword({ potency: 2, animated: true, released: true }), base, runes)).toBe(Modifier.parse(26));
  });

  test('a weapon not set free, or with no animated rune, makes no attacks of its own', () => {
    expect(releasedAttack(sword({ potency: 1, animated: true, released: false }), base, runes)).toBeUndefined();
    expect(releasedAttack(sword({ potency: 1, animated: false, released: true }), base, runes)).toBeUndefined();
  });

  test('recalling the weapon leaves its line with no state at all', () => {
    expect(sword({ potency: 1, animated: true, released: false }).state).toBeUndefined();
  });
});
