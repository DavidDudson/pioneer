import { etchRune } from '@pioneer/character/domain';
import type { Inventory, InventoryItemId, ItemEntry } from '@pioneer/character/domain';
import {
  Armoury,
  armoury,
  fundamental,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  lineOf,
  propertyRune,
  RuneFixture,
  runeFixtureContent,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { FundamentalRune, RuneType } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import {
  etchedRunes,
  fundamentalRunesFor,
  gradeChoices,
  hasPropertyRoom,
  propertyRuneOptions,
  runeKey,
  runeOfKey,
  transferTargets,
} from './rune-options';

const items = itemFixtureContent();
const content = { items, runes: runeFixtureContent() };
const SWORD = items.get(itemFixtureId(ItemFixture.Longsword));
const ARMOR = items.get(itemFixtureId(ItemFixture.LeatherArmor));
const SHIELD = items.get(itemFixtureId(ItemFixture.SteelShield));
const ROPE = items.get(itemFixtureId(ItemFixture.Rope));
const TONGUE = items.get(itemFixtureId(ItemFixture.FlameTongue));
const compare = (left: string, right: string): number => left.localeCompare(right);

function entryOf(inventory: Inventory, id: InventoryItemId): ItemEntry | undefined {
  return items.get(lineOf(inventory, id).item);
}

/** The armoury with its first longsword at +1 flaming. */
function flamingSword(): Inventory {
  return etchRune(
    etchRune(armoury(), Armoury.Sword, fundamental(FundamentalRune.Potency, 1)),
    Armoury.Sword,
    propertyRune(RuneFixture.Flaming),
  );
}

describe(fundamentalRunesFor, () => {
  it('offers potency and striking on a weapon, potency and resilient on armour, reinforcing on a shield', () => {
    expect(fundamentalRunesFor(SWORD)).toStrictEqual(['potency', 'striking']);
    expect(fundamentalRunesFor(ARMOR)).toStrictEqual(['potency', 'resilient']);
    expect(fundamentalRunesFor(SHIELD)).toStrictEqual(['reinforcing']);
    expect(fundamentalRunesFor(ROPE)).toStrictEqual([]);
  });
});

describe(gradeChoices, () => {
  it('offers every grade, or those above what a specific item comes with', () => {
    expect(gradeChoices(FundamentalRune.Reinforcing, undefined)).toStrictEqual([1, 2, 3, 4, 5, 6]);
    expect(gradeChoices(FundamentalRune.Potency, TONGUE)).toStrictEqual([2, 3, 4]);
  });
});

describe(propertyRuneOptions, () => {
  it("offers the item's kind of property runes it hasn't, by name", () => {
    const inventory = flamingSword();
    const item = lineOf(inventory, Armoury.Sword);
    const offered = propertyRuneOptions(content, { item, entry: entryOf(inventory, Armoury.Sword) }, compare);
    expect(offered.map(({ label }) => label)).toStrictEqual(['Frost', 'Keen', 'Shock']);
  });

  it('offers nothing for a specific item', () => {
    const item = lineOf(armoury(), Armoury.Tongue);
    const offered = propertyRuneOptions(content, { item, entry: TONGUE }, compare);
    expect(offered).toStrictEqual([]);
  });
});

describe(hasPropertyRoom, () => {
  it('has room while there are fewer property runes than the potency grade', () => {
    const inventory = flamingSword();
    expect(hasPropertyRoom(lineOf(inventory, Armoury.Sword), entryOf(inventory, Armoury.Sword))).toBe(false);
    const roomy = etchRune(inventory, Armoury.Sword, fundamental(FundamentalRune.Potency, 2));
    expect(hasPropertyRoom(lineOf(roomy, Armoury.Sword), entryOf(roomy, Armoury.Sword))).toBe(true);
  });
});

describe(etchedRunes, () => {
  it('lists the fundamental then property runes etched, keyed for the move form', () => {
    const inventory = flamingSword();
    const etched = etchedRunes(lineOf(inventory, Armoury.Sword), entryOf(inventory, Armoury.Sword));
    const flaming = { type: RuneType.Property, rune: runeFixtureId(RuneFixture.Flaming) };
    expect(etched).toStrictEqual([{ type: RuneType.Fundamental, rune: FundamentalRune.Potency }, flaming]);
    expect(runeOfKey(runeKey(flaming), etched)).toStrictEqual(flaming);
  });
});

describe(transferTargets, () => {
  it('offers the other items of the same kind, not specific ones', () => {
    expect(transferTargets(armoury(), content, Armoury.Sword).map(({ value }) => value)).toStrictEqual([
      Armoury.Bow,
      Armoury.Axe,
    ]);
    expect(transferTargets(armoury(), content, Armoury.Rope)).toStrictEqual([]);
  });
});
