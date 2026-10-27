import { describe, expect, test } from 'bun:test';

import { Coin, COPPER_PER_COIN, CopperValue } from '@pioneer/rules/sdk';

import { CharacterLevel } from './character-fields';
import { CORE_TREASURE_BY_LEVEL, treasureAt } from './treasure-by-level';

const FIRST = CharacterLevel.parse(1);
const LAST = CharacterLevel.parse(20);
const LEVEL_ONE_GP = 15;
const LEVEL_TWENTY_GP = 112_000;
const PAIRS_FROM = 1;

/** The values that are worth less than the one before. */
function falls(table: readonly number[]): readonly number[] {
  return table.filter((value, index) => value < (table[index - PAIRS_FROM] ?? value));
}

describe('treasure by level', () => {
  test('is the core rules lump sum at the first and last level', () => {
    expect(treasureAt(CORE_TREASURE_BY_LEVEL, FIRST)).toBe(
      CopperValue.parse(LEVEL_ONE_GP * COPPER_PER_COIN[Coin.Gold]),
    );
    expect(treasureAt(CORE_TREASURE_BY_LEVEL, LAST)).toBe(
      CopperValue.parse(LEVEL_TWENTY_GP * COPPER_PER_COIN[Coin.Gold]),
    );
  });

  test('never falls from one level to the next', () => {
    expect(falls(CORE_TREASURE_BY_LEVEL)).toEqual([]);
  });
});
