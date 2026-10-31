import { describe, expect, test } from 'bun:test';

import { Attribute } from '@pioneer/rules/sdk';

import { FAVOURED, favouring, GenerationThemeSchema, NEUTRAL_THEME, themeWeight, UNTHEMED } from './generation-theme';
import { Seed, seededPicks } from './pick-source';
import { PickWeight, weightedShuffle } from './picks';
import type { Weighted } from './picks';

const SEED = Seed.parse(11);
const DRAWS = 400;
const LIGHT = PickWeight.parse(1);
const HEAVY = PickWeight.parse(20);
const ZERO = PickWeight.parse(0);

const entries: readonly Weighted<string>[] = [
  { item: 'light', weight: LIGHT },
  { item: 'heavy', weight: HEAVY },
];

/** How often `item` comes first over `DRAWS` shuffles of `list`. */
function firsts(list: readonly Weighted<string>[], item: string): number {
  const source = seededPicks(SEED);
  return Array.from({ length: DRAWS }, () => weightedShuffle(source, list)[0]).filter((first) => first === item).length;
}

describe('generation theme', () => {
  test('a theme is a validated value', () => {
    const { attributes } = NEUTRAL_THEME;
    expect(GenerationThemeSchema.safeParse({ attributes: { ...attributes, [Attribute.Strength]: 0 } }).success).toBe(
      false,
    );
    expect(GenerationThemeSchema.safeParse({ attributes: { [Attribute.Strength]: UNTHEMED } }).success).toBe(false);
    expect(GenerationThemeSchema.safeParse({ attributes, extra: UNTHEMED }).success).toBe(false);
    expect(GenerationThemeSchema.safeParse({ attributes }).success).toBe(true);
  });

  test('a pick weighs its heaviest attribute, and the least when it has none', () => {
    const theme = favouring([Attribute.Strength]);
    expect(themeWeight(theme, [Attribute.Dexterity, Attribute.Strength])).toBe(PickWeight.parse(FAVOURED));
    expect(themeWeight(theme, [Attribute.Dexterity])).toBe(PickWeight.parse(UNTHEMED));
    expect(themeWeight(theme, [])).toBe(PickWeight.parse(UNTHEMED));
  });
});

describe('weighted shuffle', () => {
  test('puts every entry somewhere', () => {
    expect([...weightedShuffle(seededPicks(SEED), entries)].toSorted()).toEqual(['heavy', 'light']);
  });

  test('puts the heavier entry first more often, and the lighter one still sometimes', () => {
    expect(firsts(entries, 'heavy')).toBeGreaterThan(firsts(entries, 'light'));
    expect(firsts(entries, 'light')).toBeGreaterThan(0);
  });

  test('puts an entry of weight zero last', () => {
    expect(weightedShuffle(seededPicks(SEED), [{ item: 'never', weight: ZERO }, ...entries]).at(-1)).toBe('never');
  });
});
