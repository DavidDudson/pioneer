import { describe, expect, test } from 'bun:test';

import { AttributeModifier, ItemState, OriginHopKind, Slug } from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import type { CharacterDocument } from './character-document';
import { activeItems, equippedInputs, equippedRules } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, investItem, InventoryItemId, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, Hands, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { slotContent } from './slot-offer';
import { CharacterBuilder, ItemFixture, itemFixtureContent, itemFixtureId, itemFixtureRegistry } from './testing';

installRulesFakes();
const content = itemFixtureContent();
const one = ItemQuantity.parse(1);
const WORN: Carry = { state: CarryState.Worn };
const ONE_HANDED: Carry = { state: CarryState.Held, hands: ONE_HAND };

function idAt(index: number): InventoryItemId {
  return InventoryItemId.parse(`00000000-0000-4000-8000-${String(index).padStart(12, '0')}`);
}

/** An inventory of `items`, each carried as given, the nth with id `idAt(n)`. */
function carrying(...items: readonly (readonly [ItemFixture, Carry])[]): Inventory {
  let stock = EMPTY_INVENTORY;
  for (const [index, [name, carry]] of items.entries()) {
    stock = addItem(stock, { id: idAt(index), item: itemFixtureId(name), quantity: one, container: undefined });
    stock = carryItem(stock, idAt(index), carry);
  }
  return stock;
}

/** A character's document carrying `inventory`. */
function withInventory(inventory: Inventory): CharacterDocument {
  return { ...new CharacterBuilder().build().document, inventory };
}

describe('equippedInputs', () => {
  test('worn armour gives its bonus and Dexterity cap, reached through the inventory', () => {
    const inputs = equippedInputs(carrying([ItemFixture.LeatherArmor, WORN]), content);
    expect(inputs.armor).toMatchObject({
      bonus: 1,
      origin: {
        hops: [{ kind: OriginHopKind.Inventory, item: idAt(0), state: ItemState.Worn }],
        entry: itemFixtureId(ItemFixture.LeatherArmor),
      },
    });
    expect(inputs.dexterityCap).toBe(AttributeModifier.parse(4));
  });

  test('stowed armour gives nothing', () => {
    expect(equippedInputs(carrying([ItemFixture.LeatherArmor, { state: CarryState.Stowed }]), content)).toStrictEqual({
      weapons: [],
    });
  });

  test('each held weapon is a Strike, the same weapon twice told apart', () => {
    const inputs = equippedInputs(
      carrying([ItemFixture.Longsword, ONE_HANDED], [ItemFixture.Longsword, ONE_HANDED]),
      content,
    );
    expect(inputs.weapons.map(({ slug }) => slug)).toStrictEqual(
      ['longsword', 'longsword-2'].map((slug) => Slug.parse(slug)),
    );
    expect(inputs.weapons[0]).toMatchObject({
      category: 'martial',
      origin: { hops: [{ kind: OriginHopKind.Inventory, item: idAt(0), state: ItemState.Held }] },
    });
  });

  test('a two-handed weapon in one hand, or a dropped one, is no Strike', () => {
    const twoHanded = carrying(
      [ItemFixture.Greatsword, ONE_HANDED],
      [ItemFixture.Longsword, { state: CarryState.Dropped }],
    );
    expect(equippedInputs(twoHanded, content).weapons).toStrictEqual([]);
    const both = carrying([ItemFixture.Greatsword, { state: CarryState.Held, hands: Hands.parse(2) }]);
    expect(equippedInputs(both, content).weapons).toHaveLength(1);
  });
});

describe('equippedInputs of an invested-trait item', () => {
  test('gives its physical benefits uninvested, while its magic waits for investing', () => {
    const armor = carrying([ItemFixture.RuneArmor, WORN]);
    expect(equippedInputs(armor, content).armor).toMatchObject({
      bonus: 2,
      origin: { hops: [{ kind: OriginHopKind.Inventory, item: idAt(0), state: ItemState.Worn }] },
    });
    expect(activeItems(armor, content)).toStrictEqual([]);
    const invested = activeItems(investItem(armor, idAt(0), true), content);
    expect(invested.map(({ state }) => state)).toStrictEqual([ItemState.Invested]);
  });
});

describe('equippedRules', () => {
  const slots = slotContent(itemFixtureRegistry());
  const cloak = carrying([ItemFixture.Cloak, WORN]);

  test('an invested item puts its rule elements in play, with an invested inventory hop', () => {
    const invested = withInventory(investItem(cloak, idAt(0), true));
    const { rules } = equippedRules(invested, content, slots);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      element: { key: 'FlatModifier', selectors: ['perception'], type: 'item', value: 1 },
      origin: {
        hops: [{ kind: OriginHopKind.Inventory, item: idAt(0), state: ItemState.Invested }],
        entry: itemFixtureId(ItemFixture.Cloak),
      },
      rule: 0,
      itemLevel: 0,
    });
  });

  test('an invested-trait item not invested puts nothing in play', () => {
    expect(equippedRules(withInventory(cloak), content, slots).rules).toStrictEqual([]);
  });
});
