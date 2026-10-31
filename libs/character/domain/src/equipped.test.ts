import { describe, expect, test } from 'bun:test';

import {
  AttributeModifier,
  BaseWeapon,
  ConditionValue,
  FundamentalRune,
  ItemState,
  Level,
  OriginHopKind,
  RuneType,
  Slug,
} from '@pioneer/rules/sdk';
import { installRulesFakes } from '@pioneer/rules/sdk/testing';

import { activeItems } from './active-items';
import type { CharacterDocument } from './character-document';
import { equippedInputs, equippedRules } from './equipped';
import { addItem, carryItem, EMPTY_INVENTORY, InventoryItemId, investItem, ItemQuantity } from './inventory';
import type { Inventory } from './inventory';
import { CarryState, Hands, ONE_HAND } from './item-carry';
import type { Carry } from './item-carry';
import { eraseRune, etchRune } from './rune-edits';
import type { RuneEtching } from './rune-etching';
import { slotContent } from './slot-offer';
import type { SlotContent } from './slot-offer';
import {
  CharacterBuilder,
  clumsyFixtureId,
  encumberedFixtureId,
  fundamental,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureId,
} from './testing';

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

/** A character carrying `count` anvils, 2 Bulk each. */
function anvils(count: number): CharacterDocument {
  return withInventory(
    addItem(EMPTY_INVENTORY, {
      id: idAt(0),
      item: itemFixtureId(ItemFixture.Anvil),
      quantity: ItemQuantity.parse(count),
      container: undefined,
    }),
  );
}

describe('equippedInputs', () => {
  test('worn armour gives its bonus, check penalty and Dexterity cap, reached through the inventory', () => {
    const inputs = equippedInputs(carrying([ItemFixture.LeatherArmor, WORN]), content);
    expect(inputs.armor).toMatchObject({
      bonus: 1,
      checkPenalty: 1,
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

  test('a weapon whose name just fits a source slug keeps it whole; a second of it is cut short to tell apart', () => {
    const inputs = equippedInputs(
      carrying([ItemFixture.LongSword, ONE_HANDED], [ItemFixture.LongSword, ONE_HANDED]),
      content,
    );
    const [first, second] = inputs.weapons.map(({ slug }) => slug);
    expect(first).toBe(Slug.parse(ItemFixture.LongSword));
    // Cut to leave room for a count, less the hyphen the cut ends on; free as it is, it needs no count.
    expect(second).toBe(Slug.parse(ItemFixture.LongSword.slice(0, 59)));
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

  test("a weapon whose base the deity favours is marked favoured; another isn't", () => {
    const held = carrying([ItemFixture.Longsword, ONE_HANDED]);
    const longsword = new Set([BaseWeapon.parse('longsword')]);
    expect(equippedInputs(held, content, { favored: longsword }).weapons[0]?.favored).toBe(true);
    expect(equippedInputs(held, content).weapons[0]?.favored).toBe(false);
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

  test('carrying more than 5 Bulk at Strength +0 puts the encumbered condition in play, over the maximum too', () => {
    const condition = encumberedFixtureId();
    const clumsy = clumsyFixtureId();
    const root = { kind: OriginHopKind.Condition, condition };

    expect(equippedRules(anvils(2), content, slots).rules).toStrictEqual([]);
    const encumbered = equippedRules(anvils(3), content, slots).rules;
    expect(encumbered).toMatchObject([
      {
        element: { key: 'FlatModifier', selectors: ['all-speeds'], value: -10 },
        origin: { hops: [root], entry: condition },
      },
      { element: { key: 'GrantItem', item: clumsy }, origin: { hops: [root], entry: condition } },
      {
        element: { key: 'FlatModifier', selectors: ['dex-based'], value: '-@item.value' },
        origin: { hops: [root, { kind: OriginHopKind.Grant, by: condition, rule: 1 }], entry: clumsy },
        conditionValue: 1,
      },
    ]);
    // Encumbered itself carries no value; the Clumsy it grants arrives at 1.
    expect(encumbered.map(({ conditionValue }) => conditionValue)).toStrictEqual([
      undefined,
      undefined,
      ConditionValue.parse(1),
    ]);
    // 12 Bulk is over the maximum of 10, and still encumbered.
    expect(equippedRules(anvils(6), content, slots).rules.map(({ origin }) => origin.entry)).toStrictEqual([
      condition,
      condition,
      clumsy,
    ]);
  });

  test('puts nothing in play for encumbrance when no loaded pack has the condition', () => {
    const heavy = anvils(10);
    const withoutConditions: SlotContent = { ...slots, lookup: { ...slots.lookup, ofKind: () => [] } };

    expect(equippedRules(heavy, content, withoutConditions).rules).toStrictEqual([]);
  });
});

function etched(inventory: Inventory, ...etchings: readonly RuneEtching[]): Inventory {
  let stock = inventory;
  for (const etching of etchings) {
    stock = etchRune(stock, idAt(0), etching);
  }
  return stock;
}

describe('equipped runes', () => {
  const slots = slotContent(itemFixtureRegistry());

  const flaming: RuneEtching = { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Flaming) };

  test("a held weapon's Strike reads its etched potency and striking runes", () => {
    const sword = etched(
      carrying([ItemFixture.Longsword, ONE_HANDED]),
      fundamental(FundamentalRune.Potency, 2),
      fundamental(FundamentalRune.Striking, 1),
    );
    expect(equippedInputs(sword, content).weapons[0]).toMatchObject({ potency: 2, striking: 1 });
  });

  test("a specific weapon's Strike reads the runes printed on it", () => {
    const tongue = carrying([ItemFixture.FlameTongue, ONE_HANDED]);
    expect(equippedInputs(tongue, content).weapons[0]).toMatchObject({ potency: 1, striking: 1 });
  });

  test("worn armour's runes work only while it is invested: potency to AC, resilient to saves", () => {
    const armor = etched(
      carrying([ItemFixture.LeatherArmor, WORN]),
      fundamental(FundamentalRune.Potency, 1),
      fundamental(FundamentalRune.Resilient, 2),
    );
    expect(equippedInputs(armor, content).armor).toMatchObject({ bonus: 1, resilient: undefined });
    const invested = investItem(armor, idAt(0), true);
    expect(equippedInputs(invested, content).armor).toMatchObject({ bonus: 2, resilient: 2 });
  });

  test("a held weapon's working property runes put their rules in play, at the weapon's level", () => {
    const sword = etched(
      carrying([ItemFixture.Longsword, ONE_HANDED]),
      fundamental(FundamentalRune.Potency, 1),
      flaming,
    );
    const { rules } = equippedRules(withInventory(sword), content, slots);
    expect(rules).toHaveLength(1);
    expect(rules[0]).toMatchObject({
      element: { key: 'FlatModifier', selectors: ['perception'] },
      origin: {
        hops: [{ kind: OriginHopKind.Inventory, item: idAt(0), state: ItemState.Held }],
        entry: runeFixtureId(RuneFixture.Flaming),
      },
    });
    const tongue = carrying([ItemFixture.FlameTongue, ONE_HANDED]);
    expect(equippedRules(withInventory(tongue), content, slots).rules[0]?.itemLevel).toBe(Level.parse(8));
  });

  test('a property rune past the potency grade, or on a stowed weapon, puts nothing in play', () => {
    const dormant = eraseRune(
      etched(carrying([ItemFixture.Longsword, ONE_HANDED]), fundamental(FundamentalRune.Potency, 1), flaming),
      idAt(0),
      { type: RuneType.Fundamental, rune: FundamentalRune.Potency },
    );
    expect(equippedRules(withInventory(dormant), content, slots).rules).toStrictEqual([]);
    const stowed = etched(
      carrying([ItemFixture.Longsword, { state: CarryState.Stowed }]),
      fundamental(FundamentalRune.Potency, 1),
      flaming,
    );
    expect(equippedRules(withInventory(stowed), content, slots).rules).toStrictEqual([]);
  });

  test("armour's property runes work only while it is invested", () => {
    const shadow: RuneEtching = { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Shadow) };
    const armor = etched(carrying([ItemFixture.LeatherArmor, WORN]), fundamental(FundamentalRune.Potency, 1), shadow);
    expect(equippedRules(withInventory(armor), content, slots).rules).toStrictEqual([]);
    const invested = withInventory(investItem(armor, idAt(0), true));
    expect(equippedRules(invested, content, slots).rules.map(({ origin }) => origin.entry)).toStrictEqual([
      runeFixtureId(RuneFixture.Shadow),
    ]);
  });
});
