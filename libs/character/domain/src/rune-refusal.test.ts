import { describe, expect, test } from 'bun:test';

import { FundamentalRune, RuneType } from '@pioneer/rules/sdk';

import { InventoryRefusalField } from './inventory';
import type { Inventory, InventoryItemId, InventoryRefusal } from './inventory';
import { etchRune, RuneAction } from './rune-edits';
import type { RuneEdit } from './rune-edits';
import { RuneEtchingSchema } from './rune-etching';
import type { RuneEtching, RuneRef } from './rune-etching';
import { runeRefusal } from './rune-refusal';
import {
  Armoury,
  armoury,
  fundamental,
  fundamentalRef,
  ItemFixture,
  itemFixtureContent,
  itemFixtureId,
  propertyRune,
  RuneFixture,
  runeFixtureContent,
} from './testing';

const content = { items: itemFixtureContent(), runes: runeFixtureContent() };

const POTENCY_1 = fundamental(FundamentalRune.Potency, 1);
const POTENCY_2 = fundamental(FundamentalRune.Potency, 2);
const STRIKING_1 = fundamental(FundamentalRune.Striking, 1);
const STRIKING_3 = fundamental(FundamentalRune.Striking, 3);
const RESILIENT_2 = fundamental(FundamentalRune.Resilient, 2);
const REINFORCING_6 = fundamental(FundamentalRune.Reinforcing, 6);
const FLAMING = propertyRune(RuneFixture.Flaming);
const FROST = propertyRune(RuneFixture.Frost);
const SHOCK = propertyRune(RuneFixture.Shock);
const KEEN = propertyRune(RuneFixture.Keen);
const SHADOW = propertyRune(RuneFixture.Shadow);
const POTENCY = fundamentalRef(FundamentalRune.Potency);
const STRIKING = fundamentalRef(FundamentalRune.Striking);

function refusal(inventory: Inventory, edit: RuneEdit): InventoryRefusal | undefined {
  return runeRefusal(content, inventory, edit);
}

function refused(inventory: Inventory, edit: RuneEdit): string | undefined {
  return refusal(inventory, edit)?.message.key;
}

function etch(id: InventoryItemId, rune: RuneEtching): RuneEdit {
  return { action: RuneAction.Etch, id, rune };
}

function erase(id: InventoryItemId, rune: RuneRef): RuneEdit {
  return { action: RuneAction.Erase, id, rune };
}

function transfer(
  rune: RuneRef,
  to: InventoryItemId = Armoury.SpareSword,
  from: InventoryItemId = Armoury.Sword,
): RuneEdit {
  return { action: RuneAction.Transfer, id: from, rune, to };
}

function etched(inventory: Inventory, id: InventoryItemId, ...etchings: readonly RuneEtching[]): Inventory {
  let stock = inventory;
  for (const etching of etchings) {
    stock = etchRune(stock, id, etching);
  }
  return stock;
}

/** The armoury with its first longsword at +2 striking flaming. */
function runedSword(): Inventory {
  return etched(armoury(), Armoury.Sword, POTENCY_2, STRIKING_1, FLAMING);
}

describe('runeRefusal: etching', () => {
  test('allows each fundamental rune on the item it goes on', () => {
    expect(refused(armoury(), etch(Armoury.Sword, STRIKING_3))).toBeUndefined();
    expect(refused(armoury(), etch(Armoury.Armor, RESILIENT_2))).toBeUndefined();
    expect(refused(armoury(), etch(Armoury.Shield, REINFORCING_6))).toBeUndefined();
  });

  test('refuses a fundamental rune on an item it does not go on', () => {
    expect(refused(armoury(), etch(Armoury.Armor, STRIKING_1))).toBe('character.validation.runeNotForItem');
    expect(refused(armoury(), etch(Armoury.Shield, POTENCY_1))).toBe('character.validation.runeNotForItem');
  });

  test('refuses any rune on an item that is not a weapon, armour or shield', () => {
    expect(refusal(armoury(), etch(Armoury.Rope, POTENCY_1))).toStrictEqual({
      field: InventoryRefusalField.Rune,
      message: { key: 'character.validation.takesNoRunes' },
    });
  });

  test('a potency, striking or resilient rune goes to grade 4, a reinforcing rune to 6', () => {
    const etching = { type: RuneType.Fundamental, grade: 5 };
    expect(RuneEtchingSchema.safeParse({ ...etching, rune: FundamentalRune.Potency }).success).toBe(false);
    expect(RuneEtchingSchema.safeParse({ ...etching, rune: FundamentalRune.Reinforcing }).success).toBe(true);
  });

  test("refuses a specific item's fundamental rune at or below the grade it comes with", () => {
    expect(refused(armoury(), etch(Armoury.Tongue, POTENCY_1))).toBe('character.validation.runeNotHigher');
    expect(refused(armoury(), etch(Armoury.Tongue, POTENCY_2))).toBeUndefined();
  });

  test('refuses a property rune past the room the potency rune leaves', () => {
    expect(refused(armoury(), etch(Armoury.Sword, FLAMING))).toBe('character.validation.propertyRunesFull');
    expect(refused(runedSword(), etch(Armoury.Sword, FROST))).toBeUndefined();
    const full = etched(runedSword(), Armoury.Sword, FROST);
    expect(refusal(full, etch(Armoury.Sword, SHOCK))?.message).toStrictEqual({
      key: 'character.validation.propertyRunesFull',
      params: { maximum: 2 },
    });
  });

  test('refuses a property rune already etched', () => {
    const roomy = etched(runedSword(), Armoury.Sword, fundamental(FundamentalRune.Potency, 3));
    expect(refused(roomy, etch(Armoury.Sword, FLAMING))).toBe('character.validation.runeEtched');
  });

  test('refuses a property rune for another kind of item, or whose restriction the item does not meet', () => {
    const potent = etched(etched(armoury(), Armoury.Armor, POTENCY_1), Armoury.Bow, POTENCY_1);
    expect(refused(potent, etch(Armoury.Armor, FLAMING))).toBe('character.validation.runeNotForItem');
    expect(refused(potent, etch(Armoury.Armor, SHADOW))).toBeUndefined();
    expect(refused(potent, etch(Armoury.Bow, KEEN))).toBe('character.validation.runeNotForItem');
    expect(refused(runedSword(), etch(Armoury.Sword, KEEN))).toBeUndefined();
  });

  test('refuses a property rune no loaded pack has', () => {
    const missing: RuneEtching = { type: RuneType.Property, rune: itemFixtureId(ItemFixture.Rope) };
    expect(refused(runedSword(), etch(Armoury.Sword, missing))).toBe('character.validation.unknownRune');
  });

  test('refuses any property rune on a specific item', () => {
    const roomy = etched(armoury(), Armoury.Tongue, fundamental(FundamentalRune.Potency, 3));
    expect(refused(roomy, etch(Armoury.Tongue, FROST))).toBe('character.validation.specificRunes');
  });
});

describe('runeRefusal: erasing', () => {
  test('allows an etched rune', () => {
    expect(refused(runedSword(), erase(Armoury.Sword, FLAMING))).toBeUndefined();
  });

  test('refuses a rune that is not etched', () => {
    expect(refused(armoury(), erase(Armoury.Sword, POTENCY))).toBe('character.validation.runeNotEtched');
  });

  test("refuses a specific item's printed runes", () => {
    expect(refused(armoury(), erase(Armoury.Tongue, FLAMING))).toBe('character.validation.specificRunes');
    expect(refused(armoury(), erase(Armoury.Tongue, POTENCY))).toBe('character.validation.runeNotEtched');
  });
});

describe('runeRefusal: transferring', () => {
  test('allows moving a rune onto an item it goes on', () => {
    expect(refused(runedSword(), transfer(STRIKING))).toBeUndefined();
  });

  test('refuses moving a rune onto the item it is on', () => {
    expect(refusal(runedSword(), transfer(FLAMING, Armoury.Sword))?.field).toBe(InventoryRefusalField.To);
  });

  test('refuses moving a rune onto an item it does not go on, or without room', () => {
    expect(refused(runedSword(), transfer(STRIKING, Armoury.Armor))).toBe('character.validation.runeNotForItem');
    expect(refused(runedSword(), transfer(FLAMING))).toBe('character.validation.propertyRunesFull');
  });

  test('refuses moving weapon potency onto armour: they are separate runes', () => {
    expect(refused(runedSword(), transfer(POTENCY, Armoury.Armor))).toBe('character.validation.runeNotForItem');
  });

  test('refuses moving a fundamental rune onto an item that has one', () => {
    const both = etched(runedSword(), Armoury.SpareSword, POTENCY_1);
    expect(refused(both, transfer(POTENCY))).toBe('character.validation.runeEtched');
  });

  test('refuses moving runes onto or off a specific item', () => {
    expect(refused(runedSword(), transfer(POTENCY, Armoury.Tongue))).toBe('character.validation.specificRunes');
    const upgraded = etched(armoury(), Armoury.Tongue, POTENCY_2);
    expect(refused(upgraded, transfer(POTENCY, Armoury.Sword, Armoury.Tongue))).toBe(
      'character.validation.specificRunes',
    );
  });

  test('refuses a rune that is not etched', () => {
    expect(refused(armoury(), transfer(POTENCY))).toBe('character.validation.runeNotEtched');
  });
});
