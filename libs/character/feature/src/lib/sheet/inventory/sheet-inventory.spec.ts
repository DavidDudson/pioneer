import {
  addItem,
  carryItem,
  CarryState,
  EMPTY_INVENTORY,
  etchRune,
  InventoryItemId,
  InventoryItemName,
  investItem,
  ItemQuantity,
  ONE_HAND,
} from '@pioneer/character/domain';
import type { Inventory } from '@pioneer/character/domain';
import {
  fundamental,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  propertyRune,
  RuneFixture,
  runeFixtureContent,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { FundamentalRune } from '@pioneer/rules/sdk';
import { LoadEffect } from '@pioneer/rules/ui';
import type { RuneBadgeData } from '@pioneer/rules/ui';
import { describe, expect, it } from 'vitest';

import { CORE_TABLE } from '../../data/character-rule-limit-store';
import { containerOptions, sheetInventory } from './sheet-inventory';

const content = itemFixtureContent();
const runed = { items: content, runes: runeFixtureContent() };
const one = ItemQuantity.parse(1);
const backpack = InventoryItemId.parse('11111111-1111-4111-8111-111111111111');
const pouch = InventoryItemId.parse('22222222-2222-4222-8222-222222222222');
const rope = InventoryItemId.parse('33333333-3333-4333-8333-333333333333');
const sword = InventoryItemId.parse('44444444-4444-4444-8444-444444444444');
const diamond = InventoryItemId.parse('55555555-5555-4555-8555-555555555555');

function present<TValue>(value: TValue | undefined): TValue {
  if (value === undefined) {
    throw new Error('Expected a value');
  }
  return value;
}

/** Gives each line's id, so lines are added in the order listed. */
function stock(lines: readonly [InventoryItemId, ItemFixture, InventoryItemId | undefined][]): Inventory {
  let inventory = EMPTY_INVENTORY;
  for (const [id, name, container] of lines) {
    inventory = addItem(inventory, { id, item: itemFixtureId(name), quantity: one, container });
  }
  return inventory;
}

/** A worn backpack holding a second backpack (the pouch) holding a rope, a sword in hand and a loose diamond. */
const PACKED = carryItem(
  carryItem(
    stock([
      [diamond, ItemFixture.Diamond, undefined],
      [backpack, ItemFixture.Backpack, undefined],
      [pouch, ItemFixture.Backpack, backpack],
      [rope, ItemFixture.Rope, pouch],
      [sword, ItemFixture.Longsword, undefined],
    ]),
    backpack,
    { state: CarryState.Worn },
  ),
  sword,
  { state: CarryState.Held, hands: ONE_HAND },
);

describe(sheetInventory, () => {
  it('groups loose items worn, held then stowed, leaving out empty groups', () => {
    const groups = sheetInventory(PACKED, runed);
    expect(groups.map(({ placement, lines }) => [placement, lines.map((line) => line.id)])).toStrictEqual([
      ['worn', [backpack]],
      ['held', [sword]],
      ['stowed', [diamond]],
    ]);
    expect(sheetInventory(EMPTY_INVENTORY, runed)).toStrictEqual([]);
  });

  it('groups a dropped item last, and notes the hands a held one takes and an investment', () => {
    const dropped = investItem(carryItem(PACKED, diamond, { state: CarryState.Dropped }), backpack, true);
    const groups = sheetInventory(dropped, runed);
    expect(groups.map(({ placement }) => placement)).toStrictEqual(['worn', 'held', 'dropped']);
    expect(groups[1]?.lines[0]).toMatchObject({ id: sword, hands: 1, invested: false });
    expect(groups[0]?.lines[0]).toMatchObject({ id: backpack, hands: undefined, invested: true });
  });

  it('melds what is worn or held in a form, and leaves the stowed alone', () => {
    const lines = sheetInventory(PACKED, runed, { ...CORE_TABLE, melded: true }).flatMap((group) => group.lines);
    expect(lines.map((line) => [line.id, line.melded])).toStrictEqual([
      [backpack, true],
      [sword, true],
      [diamond, false],
    ]);
    expect(sheetInventory(PACKED, runed).flatMap((group) => group.lines.map((line) => line.melded))).toStrictEqual([
      false,
      false,
      false,
    ]);
  });

  it('puts what a container holds beneath it, however deep', () => {
    const worn = present(sheetInventory(PACKED, runed)[0]);
    const pack = present(worn.lines[0]);
    expect(pack.contents.map((line) => line.id)).toStrictEqual([pouch]);
    expect(present(pack.contents[0]).contents.map((line) => [line.id, line.name, line.bulk])).toStrictEqual([
      [rope, 'Rope', 'light'],
    ]);
  });

  it('gives a container what it holds against what it can, and what it does to that Bulk', () => {
    const pack = present(present(sheetInventory(PACKED, runed)[0]).lines[0]);

    expect(pack.load).toMatchObject({ capacity: 4, effect: LoadEffect.Ignores });
    expect(pack.load?.held).toBeGreaterThanOrEqual(0);
    const [sworn] = sheetInventory(stock([[sword, ItemFixture.Longsword, undefined]]), runed);
    expect(present(sworn).lines[0]?.load).toBeUndefined();
  });

  it('shows the player’s name with the content’s beside it', () => {
    const named = stock([[sword, ItemFixture.Longsword, undefined]]);
    const [item] = named.items;
    const renamed = { ...named, items: [{ ...present(item), name: InventoryItemName.parse('Oathkeeper') }] };
    const [held] = sheetInventory(renamed, runed);
    expect(present(held).lines[0]).toMatchObject({ name: 'Oathkeeper', contentName: 'Longsword' });
  });

  it('gives the runes an item name reads, by grade and by name', () => {
    let etched = stock([[sword, ItemFixture.Longsword, undefined]]);
    etched = etchRune(etched, sword, fundamental(FundamentalRune.Potency, 1));
    etched = etchRune(etched, sword, fundamental(FundamentalRune.Striking, 2));
    etched = etchRune(etched, sword, propertyRune(RuneFixture.Flaming));
    const [held] = sheetInventory(etched, runed);
    expect(present(held).lines[0]?.runes).toStrictEqual({
      potency: 1,
      fundamental: [{ rune: FundamentalRune.Striking, grade: 2 }],
      property: ['Flaming'],
    });
  });

  it('gives no runes for an item without any, or a specific item, whose name has them', () => {
    const plain = stock([[sword, ItemFixture.Longsword, undefined]]);
    expect(present(sheetInventory(plain, runed)[0]).lines[0]?.runes).toBeUndefined();
    const tongue = stock([[sword, ItemFixture.FlameTongue, undefined]]);
    expect(present(sheetInventory(tongue, runed)[0]).lines[0]?.runes).toBeUndefined();
  });

  it('badges a weapon’s runes, with a hole for each slot it has room for', () => {
    let etched = stock([[sword, ItemFixture.Longsword, undefined]]);
    const bare = present(sheetInventory(etched, runed)[0]).lines[0]?.runeBadges;
    expect(bare).toStrictEqual([{ kind: 'hole' }, { kind: 'hole' }]);
    etched = etchRune(etched, sword, fundamental(FundamentalRune.Potency, 2));
    etched = etchRune(etched, sword, propertyRune(RuneFixture.Flaming));
    const badges = present(sheetInventory(etched, runed)[0]).lines[0]?.runeBadges;
    expect(badges).toStrictEqual([
      { kind: 'fundamental', rune: FundamentalRune.Potency, grade: 2 },
      { kind: 'hole' },
      { kind: 'property', id: runeFixtureId(RuneFixture.Flaming), name: 'Flaming' },
      { kind: 'hole' },
    ]);
  });

  it('leaves another rune’s badge as it was when a rune is added', () => {
    const base = etchRune(
      stock([[sword, ItemFixture.Longsword, undefined]]),
      sword,
      fundamental(FundamentalRune.Potency, 3),
    );
    const flaming = etchRune(base, sword, propertyRune(RuneFixture.Flaming));
    const both = etchRune(flaming, sword, propertyRune(RuneFixture.Frost));
    const badge: RuneBadgeData = { kind: 'property', id: runeFixtureId(RuneFixture.Flaming), name: 'Flaming' };

    expect(present(sheetInventory(flaming, runed)[0]).lines[0]?.runeBadges).toContainEqual(badge);
    expect(present(sheetInventory(both, runed)[0]).lines[0]?.runeBadges).toContainEqual(badge);
  });

  it('badges armour’s potency and resilient runes, with a hole for each free slot', () => {
    let etched = stock([[sword, ItemFixture.LeatherArmor, undefined]]);
    const bare = present(sheetInventory(etched, runed)[0]).lines[0]?.runeBadges;
    expect(bare).toStrictEqual([{ kind: 'hole' }, { kind: 'hole' }]);
    etched = etchRune(etched, sword, fundamental(FundamentalRune.Potency, 1));
    etched = etchRune(etched, sword, fundamental(FundamentalRune.Resilient, 2));
    const badges = present(sheetInventory(etched, runed)[0]).lines[0]?.runeBadges;
    expect(badges).toStrictEqual([
      { kind: 'fundamental', rune: FundamentalRune.Potency, grade: 1 },
      { kind: 'fundamental', rune: FundamentalRune.Resilient, grade: 2 },
      { kind: 'hole' },
    ]);
  });

  it('badges a shield’s reinforcing rune, and gives it no property slots', () => {
    let etched = stock([[sword, ItemFixture.SteelShield, undefined]]);
    const bare = present(sheetInventory(etched, runed)[0]).lines[0]?.runeBadges;
    expect(bare).toStrictEqual([{ kind: 'hole' }]);
    etched = etchRune(etched, sword, fundamental(FundamentalRune.Reinforcing, 3));
    const badges = present(sheetInventory(etched, runed)[0]).lines[0]?.runeBadges;
    expect(badges).toStrictEqual([{ kind: 'fundamental', rune: FundamentalRune.Reinforcing, grade: 3 }]);
  });

  it('badges nothing for an item that takes no runes, and gives a specific weapon no holes', () => {
    const plain = stock([[rope, ItemFixture.Rope, undefined]]);
    expect(present(sheetInventory(plain, runed)[0]).lines[0]?.runeBadges).toStrictEqual([]);
    const tongue = stock([[sword, ItemFixture.FlameTongue, undefined]]);
    const badges = present(sheetInventory(tongue, runed)[0]).lines[0]?.runeBadges;
    expect(badges).not.toContainEqual({ kind: 'hole' });
  });
});

describe(containerOptions, () => {
  it('offers every container for a new item', () => {
    expect(containerOptions(PACKED, content, undefined).map((option) => option.value)).toStrictEqual([backpack, pouch]);
  });

  it('never offers a container a place inside itself or what it holds', () => {
    expect(containerOptions(PACKED, content, backpack)).toStrictEqual([]);
    expect(containerOptions(PACKED, content, rope).map((option) => option.value)).toStrictEqual([backpack, pouch]);
  });
});
