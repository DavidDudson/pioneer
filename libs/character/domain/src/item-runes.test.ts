import { describe, expect, test } from 'bun:test';

import { FundamentalRune, RuneGrade } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import type { Inventory, InventoryItemId } from './inventory';
import { itemRunes, workingPropertyRunes } from './item-runes';
import { eraseRune, etchRune, transferRune } from './rune-edits';
import { ItemRunesSchema, NO_RUNES } from './rune-etching';
import type { ItemRunes } from './rune-etching';
import {
  Armoury,
  armoury,
  fundamental,
  fundamentalRef,
  itemFixtureContent,
  lineOf,
  propertyRune,
  RuneFixture,
  runeFixtureId,
} from './testing';

const content = itemFixtureContent();

const FLAMING = propertyRune(RuneFixture.Flaming);
const FROST = propertyRune(RuneFixture.Frost);
const FLAMING_ID = runeFixtureId(RuneFixture.Flaming);
const POTENCY = fundamentalRef(FundamentalRune.Potency);
const STRIKING = fundamentalRef(FundamentalRune.Striking);

/** `json` as runes on an item. */
function runes(json: object): ItemRunes {
  return ItemRunesSchema.parse(json);
}

function runesOf(inventory: Inventory, id: InventoryItemId): ItemRunes {
  const line = lineOf(inventory, id);
  return itemRunes(line, content.get(line.item));
}

function working(inventory: Inventory, id: InventoryItemId): readonly ContentId[] {
  const line = lineOf(inventory, id);
  return workingPropertyRunes(line, content.get(line.item));
}

/** The armoury with its first longsword at +2 striking flaming. */
function runedSword(): Inventory {
  let inventory = etchRune(armoury(), Armoury.Sword, fundamental(FundamentalRune.Potency, 2));
  inventory = etchRune(inventory, Armoury.Sword, fundamental(FundamentalRune.Striking, 1));
  return etchRune(inventory, Armoury.Sword, FLAMING);
}

describe('etching runes', () => {
  test('a plain item has no runes until some are etched', () => {
    expect(runesOf(armoury(), Armoury.Sword)).toStrictEqual(NO_RUNES);
    expect(lineOf(armoury(), Armoury.Sword).runes).toBeUndefined();
  });

  test('fundamental and property runes are etched onto the item', () => {
    expect(runesOf(runedSword(), Armoury.Sword)).toStrictEqual(
      runes({ potency: 2, striking: 1, property: [FLAMING_ID] }),
    );
  });

  test('a fundamental rune etched again replaces the grade it had', () => {
    const inventory = etchRune(runedSword(), Armoury.Sword, fundamental(FundamentalRune.Potency, 1));
    expect(runesOf(inventory, Armoury.Sword).potency).toBe(RuneGrade.parse(1));
  });

  test('erasing every rune leaves the item as it was', () => {
    let inventory = eraseRune(runedSword(), Armoury.Sword, POTENCY);
    inventory = eraseRune(inventory, Armoury.Sword, STRIKING);
    inventory = eraseRune(inventory, Armoury.Sword, FLAMING);
    expect(lineOf(inventory, Armoury.Sword)).toStrictEqual(lineOf(armoury(), Armoury.Sword));
  });

  test('a specific item has the runes printed on it, and a fundamental rune etched higher', () => {
    expect(runesOf(armoury(), Armoury.Tongue)).toEqual(runes({ potency: 1, striking: 1, property: [FLAMING_ID] }));
    const upgraded = etchRune(armoury(), Armoury.Tongue, fundamental(FundamentalRune.Potency, 2));
    expect(runesOf(upgraded, Armoury.Tongue).potency).toBe(RuneGrade.parse(2));
    const erased = eraseRune(upgraded, Armoury.Tongue, POTENCY);
    expect(runesOf(erased, Armoury.Tongue).potency).toBe(RuneGrade.parse(1));
  });
});

describe('transferring runes', () => {
  test('moves a fundamental rune at its grade, and a property rune', () => {
    let inventory = transferRune(runedSword(), { from: Armoury.Sword, to: Armoury.SpareSword, rune: POTENCY });
    inventory = transferRune(inventory, { from: Armoury.Sword, to: Armoury.SpareSword, rune: FLAMING });
    expect(runesOf(inventory, Armoury.Sword)).toStrictEqual(runes({ striking: 1, property: [] }));
    expect(runesOf(inventory, Armoury.SpareSword)).toStrictEqual(runes({ potency: 2, property: [FLAMING_ID] }));
  });

  test('leaves the inventory as it was for a rune that is not etched', () => {
    const moved = transferRune(armoury(), { from: Armoury.Sword, to: Armoury.SpareSword, rune: POTENCY });
    expect(moved).toStrictEqual(armoury());
  });
});

describe('property runes that work', () => {
  test('as many as the potency grade, first etched first', () => {
    let inventory = etchRune(runedSword(), Armoury.Sword, FROST);
    expect(working(inventory, Armoury.Sword)).toHaveLength(2);
    inventory = etchRune(inventory, Armoury.Sword, fundamental(FundamentalRune.Potency, 1));
    expect(working(inventory, Armoury.Sword)).toStrictEqual([FLAMING_ID]);
  });

  test('none without a potency rune, though they stay etched', () => {
    const inventory = eraseRune(runedSword(), Armoury.Sword, POTENCY);
    expect(working(inventory, Armoury.Sword)).toStrictEqual([]);
    expect(runesOf(inventory, Armoury.Sword).property).toStrictEqual([FLAMING_ID]);
  });

  test("all of a specific item's, whatever its potency", () => {
    expect(working(armoury(), Armoury.Tongue)).toStrictEqual([FLAMING_ID]);
  });
});
