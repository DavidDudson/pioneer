import { Coin, COPPER_PER_COIN, CopperValue } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { CHARACTER_LEVEL_MAX } from './character-fields';
import type { CharacterLevel } from './character-fields';
import data from './treasure-by-level.json';

/**
 * What a character of each level may own, in copper, level 1 first. It is table data, not a constant of the generator
 * (ADR-0064): the generator takes it as an input and defaults to the core rules' table (`CORE_TREASURE_BY_LEVEL`), so
 * a table can set its own.
 */
export const TreasureByLevelSchema = z.array(CopperValue).length(CHARACTER_LEVEL_MAX).readonly();
export type TreasureByLevel = z.infer<typeof TreasureByLevelSchema>;

const FIRST_LEVEL = 1;

/** The core rules' Character Wealth table (GM Core): the value of a character's items and coins at its level. */
export const CORE_TREASURE_BY_LEVEL: TreasureByLevel = TreasureByLevelSchema.parse(
  data.lumpSumGp.map((gold) => gold * COPPER_PER_COIN[Coin.Gold]),
);

/** What a character of `level` may own, in copper. */
export function treasureAt(table: TreasureByLevel, level: CharacterLevel): CopperValue {
  const value = table[level - FIRST_LEVEL];
  if (value === undefined) {
    throw new TypeError(`The treasure table has no level ${level}`);
  }
  return value;
}
