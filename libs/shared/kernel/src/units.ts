import * as z from 'zod';

import { Pg } from './pg';
import type { ValueOf } from './value-of';

/**
 * Branded units of measure. The brand carries the unit, so names don't repeat
 * it (`REVERT_WINDOW: Milliseconds`, not `REVERT_WINDOW_MS`).
 */
export const Milliseconds = Pg.integer().nonnegative().brand<'Milliseconds'>();
export type Milliseconds = z.infer<typeof Milliseconds>;

/** How distances are shown: as written in the rules, or converted as translated books do. */
export const DistanceUnit = {
  Feet: 'feet',
  Metres: 'metres',
} as const;
export type DistanceUnit = ValueOf<typeof DistanceUnit>;
export const DistanceUnitSchema = z.enum(DistanceUnit);

/** One 5 ft square is 1.5 m in translated PF2e books (not the exact 1.524 m). */
const FEET_PER_SQUARE = 5;
const METRES_PER_SQUARE = 1.5;
/** Metres are shown to one decimal (10 cm). */
const TENTHS = 10;

/** Feet to metres at 1.5 m per 5 ft square, rounded to the nearest 10 cm. */
export function feetToMetres(feet: number): number {
  return Math.round((feet / FEET_PER_SQUARE) * METRES_PER_SQUARE * TENTHS) / TENTHS;
}
