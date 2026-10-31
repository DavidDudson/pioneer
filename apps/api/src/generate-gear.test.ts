import { describe, expect, test } from 'bun:test';

import {
  attributeModifiers,
  CarryState,
  CharacterLevel,
  CharacterPatchField,
  CORE_TREASURE_BY_LEVEL,
  CORE_RULE_LIMITS,
  coinsValue,
  generateCharacter,
  generateGear,
  handsInUse,
  inventoryBulk,
  inventoryViolations,
  itemRunes,
  itemsValue,
  propertyRoom,
  Seed,
  treasureAt,
} from '@pioneer/character/domain';
import type { Character, ItemContent } from '@pioneer/character/domain';
import { Attribute, ContentKind } from '@pioneer/rules/sdk';
import type { AttributeModifier, ContentId } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';
import { assert, constantFrom, integer, property } from 'fast-check';

import { blankIn, contentOf, itemsOf, LEVELS, PLAYER_CORE_CLASSES, SEED_MAX } from './generate-character-testing';

const PROPERTY_RUNS = 25;
const SPOT_LEVELS = [1, 5, 10, 15, 20].map((level) => CharacterLevel.parse(level));
const SEED = 7;
const NONE = 0;
const ONE = 1;
const now = fixedClock('2026-01-01T00:00:00Z').now();

const content = await contentOf();
const runed = await itemsOf();
const { items } = runed;

/** A blank character of `className` at `level`, outfitted for it. */
function geared(className: string, level: CharacterLevel, seed: number): Character {
  const blank = blankIn(content, className).apply({ field: CharacterPatchField.Level, value: level }, now);
  return generateGear({ character: blank, seed: Seed.parse(seed), items, slots: content, now });
}

/** The kinds of the items a character carries in the way given. */
function kindsCarried(character: Character, from: ItemContent, state: CarryState): readonly ContentKind[] {
  return character.document.inventory.items
    .filter((line) => line.carry.state === state)
    .flatMap((line) => from.get(line.item)?.kind ?? []);
}

/** The Strength modifier of `character`, which limits what it carries. */
function strengthOf(character: Character): AttributeModifier {
  return attributeModifiers(character.document, content.boosts).get(Attribute.Strength);
}

/** What is wrong with the gear of a generated character, against its level's budget and the rules. */
function gearProblems(character: Character, level: CharacterLevel): readonly string[] {
  const { inventory } = character.document;
  const budget = treasureAt(CORE_TREASURE_BY_LEVEL, level);
  const worn = kindsCarried(character, items, CarryState.Worn);
  const held = kindsCarried(character, items, CarryState.Held);
  const bulk = inventoryBulk(inventory, items, strengthOf(character));
  const checks: readonly (readonly [boolean, string])[] = [
    [itemsValue(inventory, items) > budget, 'items worth more than the budget'],
    [itemsValue(inventory, items) + coinsValue(inventory.coins) > budget, 'items and coins past the budget'],
    [handsInUse(inventory.items) > 2, 'more than two hands in use'],
    [worn.filter((kind) => kind === ContentKind.Armor).length > ONE, 'two suits of armour'],
    [!held.includes(ContentKind.Weapon), 'no weapon in hand'],
    [inventoryViolations(inventory, runed).length > NONE, 'breaks a rule limit'],
    [bulk.encumbrance !== 'unencumbered', 'encumbered'],
  ];
  return checks.filter(([broken]) => broken).map(([, problem]) => problem);
}

describe('generated gear', () => {
  test.each([...PLAYER_CORE_CLASSES])('%s, at levels 1, 5, 10, 15 and 20, is legal and within the budget', (name) => {
    for (const level of SPOT_LEVELS) {
      expect({ level, problems: gearProblems(geared(name, level, SEED), level) }).toEqual({ level, problems: [] });
    }
  });

  test('the same seed gives the same gear', () => {
    const level = CharacterLevel.parse(10);
    expect(geared('Fighter', level, SEED).document.inventory).toEqual(
      geared('Fighter', level, SEED).document.inventory,
    );
  });

  test('a character is armoured and armed from the first level', () => {
    const level = CharacterLevel.parse(1);
    const character = geared('Fighter', level, SEED);
    expect(kindsCarried(character, items, CarryState.Worn)).toContain(ContentKind.Armor);
  });

  test.each([
    ['Alchemist', 4, 20],
    ['Alchemist', 5, 525_389_030],
  ] as const)('%s at level %i, seed %i, holds a weapon', (name, level, seed) => {
    const at = CharacterLevel.parse(level);
    expect(gearProblems(geared(name, at, seed), at)).toEqual([]);
  });

  test('any class, level and seed gives legal gear within the budget', () => {
    assert(
      property(
        constantFrom(...PLAYER_CORE_CLASSES),
        constantFrom(...LEVELS),
        integer({ min: NONE, max: SEED_MAX }),
        (name, level, seed) => {
          expect(gearProblems(geared(name, level, seed), level)).toEqual([]);
        },
      ),
      { numRuns: PROPERTY_RUNS },
    );
  });
});

describe('a themed weapon etched with runes', () => {
  const THEME_LEVEL = CharacterLevel.parse(15);
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
  const MISSING_RUNE_LEVEL = 99;

  /** The property runes on one weapon, and how many its potency rune leaves room for. */
  interface WeaponRunes {
    readonly names: readonly ContentId[];
    readonly room: number;
  }

  /** The level of each rune in `names`; a rune the content lacks is level 99, so it fails the level check. */
  function levelsOf(names: readonly ContentId[]): readonly number[] {
    return names.map((name) => runed.runes.get(name)?.level ?? MISSING_RUNE_LEVEL);
  }

  /** The property runes on the weapons `className` is armed with at `THEME_LEVEL`, for each seed. */
  function propertyRunesFor(className: string): readonly WeaponRunes[] {
    return SEEDS.flatMap((seed) => {
      const blank = blankIn(content, className).apply({ field: CharacterPatchField.Level, value: THEME_LEVEL }, now);
      const character = generateGear({
        character: blank,
        seed: Seed.parse(seed),
        items,
        slots: content,
        now,
        weapon: { category: 'martial', group: 'sword' },
        runes: runed.runes,
      });
      return character.document.inventory.items
        .filter((line) => items.get(line.item)?.kind === ContentKind.Weapon && line.runes !== undefined)
        .map((line) => ({
          names: line.runes?.property ?? [],
          room: propertyRoom(itemRunes(line, items.get(line.item)), CORE_RULE_LIMITS),
        }));
    });
  }

  test('carries property runes, no more than its potency rune leaves room for', () => {
    const weapons = propertyRunesFor('Fighter');
    expect(weapons.some(({ names }) => names.length > NONE)).toBe(true);
    for (const { names, room } of weapons) {
      expect(names.length).toBeLessThanOrEqual(room);
    }
  });

  test('carries only property runes no higher in level than the character', () => {
    for (const { names } of propertyRunesFor('Fighter')) {
      for (const level of levelsOf(names)) {
        expect(level).toBeLessThanOrEqual(THEME_LEVEL);
      }
    }
  });
});

describe('generated characters with gear', () => {
  test('a character generated with items is outfitted for its level', () => {
    const level = CharacterLevel.parse(5);
    const result = generateCharacter({
      start: blankIn(content, 'Fighter'),
      seed: Seed.parse(SEED),
      level,
      content,
      items,
      now,
    });
    expect({ unfilled: result.unfilled, problems: gearProblems(result.character, level) }).toEqual({
      unfilled: [],
      problems: [],
    });
  });
});
