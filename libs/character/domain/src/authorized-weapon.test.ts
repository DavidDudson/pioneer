import { describe, expect, test } from 'bun:test';

import { DamageFormula, FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { authorizedDamage, unauthorizedWielder } from './authorized-weapon';
import { CharacterName } from './character-fields';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, ItemQuantity } from './inventory';
import type { InventoryItem } from './inventory';
import { itemContent } from './inventory-content';
import { setItemState } from './inventory-state';
import { CarryState, ONE_HAND } from './item-carry';
import { runeContent } from './item-runes';
import { AuthorizedName } from './item-state';
import { etchRune } from './rune-edits';
import { fundamental, ItemFixture, itemFixtureId, itemFixtureRegistry, RuneFixture, runeFixtureId } from './testing';

installRulesFakes();
const registry = itemFixtureRegistry();
const items = itemContent(registry);
const runes = runeContent(registry);
const SWORD = InventoryItemId.parse('00000000-0000-4000-8000-000000000001');
const OWNER = AuthorizedName.parse('Valeros');
const FRIEND = AuthorizedName.parse('Seelah');

interface SwordOptions {
  readonly authorized?: boolean;
  readonly striking?: 1 | 2 | 3;
  readonly held?: boolean;
  readonly named?: boolean;
}

/** A +1 longsword, with an authorized rune when `authorized`, held when `held`, and belonging to Valeros when `named`. */
function sword({ authorized = true, striking, held = true, named = true }: SwordOptions = {}): InventoryItem {
  let inventory = addItem(EMPTY_INVENTORY, {
    id: SWORD,
    item: itemFixtureId(ItemFixture.Longsword),
    quantity: ItemQuantity.parse(1),
    container: undefined,
  });
  inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Potency, 1));
  if (striking !== undefined) {
    inventory = etchRune(inventory, SWORD, fundamental(FundamentalRune.Striking, striking));
  }
  if (authorized) {
    inventory = etchRune(inventory, SWORD, { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Authorized) });
  }
  if (named) {
    inventory = setItemState(inventory, SWORD, { authorized: { owner: OWNER, others: [FRIEND] } });
  }
  if (held) {
    inventory = carryItem(inventory, SWORD, { state: CarryState.Held, hands: ONE_HAND });
  }
  const [line] = inventory.items;
  if (line === undefined) {
    throw new Error('the sword was not added');
  }
  return line;
}

const base = items.get(itemFixtureId(ItemFixture.Longsword));

describe('authorized rune', () => {
  test('hurts with a d8 piercing and a d4 persistent bleed without a striking rune', () => {
    expect(authorizedDamage(sword(), base, runes)).toEqual({
      piercing: DamageFormula.parse('1d8'),
      bleed: DamageFormula.parse('1d4'),
    });
  });

  test('adds a die of each for every die of the weapon, striking grades included', () => {
    expect(authorizedDamage(sword({ striking: 1 }), base, runes)?.piercing).toBe(DamageFormula.parse('2d8'));
    expect(authorizedDamage(sword({ striking: 2 }), base, runes)?.bleed).toBe(DamageFormula.parse('3d4'));
    expect(authorizedDamage(sword({ striking: 3 }), base, runes)?.piercing).toBe(DamageFormula.parse('4d8'));
  });

  test('does nothing without the rune', () => {
    expect(authorizedDamage(sword({ authorized: false }), base, runes)).toBeUndefined();
  });

  test('hurts a wielder who is not the owner or one allowed', () => {
    expect(unauthorizedWielder(sword(), base, { runes, wielder: CharacterName.parse('Kyra') })).toEqual(
      authorizedDamage(sword(), base, runes),
    );
  });

  test('spares the owner and the others allowed, by name without case', () => {
    expect(unauthorizedWielder(sword(), base, { runes, wielder: CharacterName.parse('valeros ') })).toBeUndefined();
    expect(unauthorizedWielder(sword(), base, { runes, wielder: CharacterName.parse('SEELAH') })).toBeUndefined();
  });

  test('says nothing while the weapon is not held or names no owner', () => {
    expect(
      unauthorizedWielder(sword({ held: false }), base, { runes, wielder: CharacterName.parse('Kyra') }),
    ).toBeUndefined();
    expect(
      unauthorizedWielder(sword({ named: false }), base, { runes, wielder: CharacterName.parse('Kyra') }),
    ).toBeUndefined();
  });
});
