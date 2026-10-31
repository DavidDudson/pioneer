import { describe, expect, test } from 'bun:test';

import {
  CharacterLevel,
  FAVOURED,
  favouring,
  generateCharacter,
  NEUTRAL_THEME,
  Seed,
  TRAINS_WEAPON,
  UNTHEMED,
  weaponAffinity,
  WeaponThemeSchema,
  withWeapon,
} from '@pioneer/character/domain';
import type { Character, ItemEntry, WeaponTheme } from '@pioneer/character/domain';
import { Attribute, ChoiceValue, ContentKind, WeaponGroup } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';

import { blankIn, contentOf, itemsOf } from './generate-character-testing';

const LEVEL = CharacterLevel.parse(10);
const SEEDS = Array.from({ length: 8 }, (_unused, index) => index + 1);
const FIRST_SEED = 1;
const TIMEOUT_MS = 180_000;
const now = fixedClock('2026-01-01T00:00:00Z').now();
const content = await contentOf();
const { items, runes } = await itemsOf();

const SWORD: WeaponTheme = WeaponThemeSchema.parse({ category: 'martial', group: WeaponGroup.Sword });

/** The class named `name`, as a pick. */
function classPick(name: string): ChoiceValue {
  const found = content.lookup.ofKind(ContentKind.Class).find((entry) => entry.name === name);
  return ChoiceValue.parse(found?.id);
}

const AXE: WeaponTheme = WeaponThemeSchema.parse({ category: 'martial', group: WeaponGroup.Axe });

/** The feat named `name`, as a pick. */
function featPick(name: string): ChoiceValue {
  const found = content.lookup.ofKind(ContentKind.Feat).find((entry) => entry.name === name);
  return ChoiceValue.parse(found?.id);
}

/** The weapons on sale of `theme`'s group. */
function fittingOf(theme: WeaponTheme): readonly ItemEntry[] {
  return [...items.values()].filter((entry) => entry.kind === ContentKind.Weapon && entry.data.group === theme.group);
}

/** A character of `LEVEL` for `seed`, themed and outfitted with items and runes. */
function generated(seed: number, weapon: WeaponTheme): Character {
  const theme = withWeapon(favouring([Attribute.Strength]), weapon);
  return generateCharacter({
    start: blankIn(content, 'Fighter'),
    seed: Seed.parse(seed),
    level: LEVEL,
    content,
    now,
    theme,
    items,
    runes,
  }).character;
}

/** The weapons the character holds, as their content. */
function heldWeapons(character: Character): readonly WeaponGroup[] {
  return character.document.inventory.items
    .filter((line) => line.carry.state === 'held')
    .flatMap((line) => {
      const entry = items.get(line.item);
      return entry?.kind === ContentKind.Weapon && entry.data.group !== undefined ? [entry.data.group] : [];
    });
}

describe('a weapon theme', () => {
  test('names a group or a base, never neither', () => {
    expect(WeaponThemeSchema.safeParse({ category: 'martial' }).success).toBe(false);
    expect(WeaponThemeSchema.safeParse({ category: 'martial', group: 'sword' }).success).toBe(true);
    expect(WeaponThemeSchema.safeParse({ category: 'martial', group: 'sword', extra: 1 }).success).toBe(false);
  });

  test('composes with the stat theme', () => {
    const theme = withWeapon(favouring([Attribute.Strength]), SWORD);
    expect(theme.weapon).toEqual(SWORD);
    expect(theme.attributes).toEqual(favouring([Attribute.Strength]).attributes);
    expect(withWeapon(NEUTRAL_THEME, SWORD).attributes).toEqual(NEUTRAL_THEME.attributes);
  });

  test('favours a class that trains the weapon and not one that does not', () => {
    expect(weaponAffinity(content, classPick('Fighter'), SWORD)).toBeGreaterThanOrEqual(TRAINS_WEAPON);
    expect(weaponAffinity(content, classPick('Wizard'), SWORD)).toBe(UNTHEMED);
    expect(FAVOURED).toBeGreaterThan(TRAINS_WEAPON);
  });

  test('favours a feat that trains a weapon of the group by trait, only when such a weapon is on sale', () => {
    const dwarven = featPick('Dwarven Weapon Familiarity');
    expect(weaponAffinity(content, dwarven, AXE)).toBe(UNTHEMED);
    expect(weaponAffinity(content, dwarven, { ...AXE, fitting: fittingOf(AXE) })).toBe(TRAINS_WEAPON);
    expect(weaponAffinity(content, featPick('Elven Weapon Familiarity'), { ...AXE, fitting: fittingOf(AXE) })).toBe(
      UNTHEMED,
    );
  });

  test(
    'equips a weapon of the themed group, with potency and striking runes',
    () => {
      for (const seed of SEEDS) {
        const character = generated(seed, SWORD);
        expect(heldWeapons(character)).toContain(WeaponGroup.Sword);
        const weapon = character.document.inventory.items.find((line) => line.runes?.potency !== undefined);
        expect(weapon?.runes?.striking).toBeDefined();
      }
    },
    TIMEOUT_MS,
  );

  test(
    'still equips a weapon when no weapon of the theme is on sale',
    () => {
      const bad = WeaponThemeSchema.parse({ category: 'martial', base: 'no-such-weapon' });
      expect(heldWeapons(generated(FIRST_SEED, bad)).length).toBeGreaterThan(0);
    },
    TIMEOUT_MS,
  );
});
