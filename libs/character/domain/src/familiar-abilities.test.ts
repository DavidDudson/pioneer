import { describe, expect, test } from 'bun:test';

import { Level, RollOption } from '@pioneer/rules/sdk';

import { familiarAbilities, FamiliarAbilityCount, FamiliarAbilitySource } from './familiar-abilities';
import type { FamiliarAbilities } from './familiar-abilities';

const at = (level: number, ...options: Array<string>): FamiliarAbilities =>
  familiarAbilities({ level: Level.parse(level), options: options.map((option) => RollOption.parse(option)) });

const totalAt = (level: number, ...options: Array<string>): number => at(level, ...options).total;

const sourcesOf = (level: number, ...options: Array<string>): ReadonlyArray<FamiliarAbilitySource> =>
  at(level, ...options).parts.map(({ source }) => source);

describe('familiar abilities', () => {
  test.each([
    ['the base rule', [], 2],
    ['Enhanced Familiar', ['feat:enhanced-familiar'], 4],
    ['Enhanced and Incredible Familiar', ['feat:enhanced-familiar', 'feat:incredible-familiar'], 6],
  ])('%s gives %i a day', (_name, options, total) => {
    expect(totalAt(1, ...options)).toBe(total);
  });

  test('names each source with its part', () => {
    const two = FamiliarAbilityCount.parse(2);

    expect(at(1, 'feat:enhanced-familiar')).toStrictEqual({
      total: FamiliarAbilityCount.parse(4),
      parts: [
        { source: FamiliarAbilitySource.Base, amount: two },
        { source: FamiliarAbilitySource.EnhancedFamiliar, amount: two },
      ],
    });
  });

  test.each([
    [1, 4],
    [5, 4],
    [6, 5],
    [11, 5],
    [12, 6],
    [17, 6],
    [18, 7],
    [20, 7],
  ])('a witch at level %i has %i', (level, total) => {
    expect(totalAt(level, 'class:witch')).toBe(total);
  });

  test('a witch lists her own parts', () => {
    expect(sourcesOf(12, 'class:witch')).toStrictEqual([
      FamiliarAbilitySource.Base,
      FamiliarAbilitySource.WitchFamiliar,
      FamiliarAbilitySource.WitchGrowth,
    ]);
    expect(Number(at(12, 'class:witch').parts.at(-1)?.amount)).toBe(2);
  });

  test('a witch below 6th level has no growth part', () => {
    expect(sourcesOf(5, 'class:witch')).not.toContain(FamiliarAbilitySource.WitchGrowth);
  });

  test('stacks a witch with both feats at 18th level', () => {
    expect(totalAt(18, 'class:witch', 'feat:enhanced-familiar', 'feat:incredible-familiar')).toBe(11);
  });

  test('Incredible Familiar adds its own two whether or not Enhanced Familiar is held', () => {
    expect(totalAt(1, 'feat:incredible-familiar')).toBe(4);
  });

  test('a class other than witch gets no witch part', () => {
    expect(sourcesOf(20, 'class:wizard')).toStrictEqual([FamiliarAbilitySource.Base]);
  });
});
