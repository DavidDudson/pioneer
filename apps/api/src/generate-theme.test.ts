import { describe, expect, test } from 'bun:test';

import { attributeModifiers, CharacterLevel, favouring, generateCharacter, Seed } from '@pioneer/character/domain';
import type { Character, GenerationTheme } from '@pioneer/character/domain';
import { Attribute } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';

import { blankIn, contentOf } from './generate-character-testing';

const LEVEL = CharacterLevel.parse(5);
const SEEDS = Array.from({ length: 16 }, (_unused, index) => index + 1);
const TIMEOUT_MS = 120_000;
/** A class that fills every slot, so a slot left open is the theme's doing, not the class's. */
const WIZARD = 'Wizard';
const now = fixedClock('2026-01-01T00:00:00Z').now();
const content = await contentOf();

/** A character of `LEVEL`, generated for `seed` under `theme`. */
function themed(theme: GenerationTheme, seed: number): Character {
  return generateCharacter({ start: blankIn(content), seed: Seed.parse(seed), level: LEVEL, content, now, theme })
    .character;
}

/** The modifier of `attribute` of each character. */
function modifiers(characters: readonly Character[], attribute: Attribute): readonly number[] {
  return characters.map((each) => attributeModifiers(each.document, content.boosts).get(attribute));
}

function average(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

describe('a generation theme', () => {
  test(
    'ends a favoured attribute higher on average than an unfavoured one',
    () => {
      const strong = SEEDS.map((seed) => themed(favouring([Attribute.Strength]), seed));
      expect(average(modifiers(strong, Attribute.Strength))).toBeGreaterThan(
        average(modifiers(strong, Attribute.Charisma)),
      );
    },
    TIMEOUT_MS,
  );

  test(
    'leaves no slot open that the same seed fills without it',
    () => {
      const theme = favouring([Attribute.Intelligence]);
      const open = SEEDS.slice(0, 4).map(
        (seed) =>
          generateCharacter({
            start: blankIn(content, WIZARD),
            seed: Seed.parse(seed),
            level: LEVEL,
            content,
            now,
            theme,
          }).unfilled,
      );
      expect(open).toEqual([[], [], [], []]);
    },
    TIMEOUT_MS,
  );
});
