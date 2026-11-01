import { Hardness, HitPoints } from '@pioneer/rules/sdk';
import type { ReinforcingGrade } from '@pioneer/rules/sdk';
import * as z from 'zod';

import table from './reinforcing-runes.json';

/**
 * What a reinforcing rune does to a shield (GM Core, Reinforcing Runes): Hardness and Hit Points added, and the most
 * the shield can reach. Its Broken Threshold is half its Hit Points, so it follows.
 */
const ReinforcingEffect = z.strictObject({
  hardness: Hardness,
  hitPoints: HitPoints,
  maxHardness: Hardness,
  maxHitPoints: HitPoints,
});

/** Minor, lesser, moderate, greater, major and supreme, by grade 1 to 6 (`reinforcing-runes.json`). */
const REINFORCING = z.array(ReinforcingEffect).readonly().parse(table);

/** A shield's Hardness and Hit Points. */
export interface ShieldFigures {
  readonly hardness: Hardness;
  readonly hitPoints: HitPoints;
}

/**
 * `figures` with a reinforcing rune of `grade` on the shield: the rune's increase, but not past its maximum, and never
 * below what the shield already has (a shield already above the maximum keeps its own).
 */
export function reinforced(figures: ShieldFigures, grade: ReinforcingGrade | undefined): ShieldFigures {
  const rune = grade === undefined ? undefined : REINFORCING[grade - 1];
  if (rune === undefined) {
    return figures;
  }
  return {
    hardness: Hardness.parse(Math.max(figures.hardness, Math.min(figures.hardness + rune.hardness, rune.maxHardness))),
    hitPoints: HitPoints.parse(
      Math.max(figures.hitPoints, Math.min(figures.hitPoints + rune.hitPoints, rune.maxHitPoints)),
    ),
  };
}
