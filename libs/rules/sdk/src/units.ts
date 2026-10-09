import { Pg } from '@pioneer/shared/kernel';
import type { z } from 'zod';

/**
 * Game quantities, branded so a speed can't be added to a hit point total.
 * The brand carries the unit, so names don't repeat it (`speed: Feet`).
 */
export const Feet = Pg.smallint().nonnegative().brand<'Feet'>();
export type Feet = z.infer<typeof Feet>;

export const HitPoints = Pg.smallint().nonnegative().brand<'HitPoints'>();
export type HitPoints = z.infer<typeof HitPoints>;

/** Damage dealt, or the amount a weakness adds or a resistance removes. */
export const DamageAmount = Pg.smallint().positive().brand<'DamageAmount'>();
export type DamageAmount = z.infer<typeof DamageAmount>;

/** A check modifier: perception, saves, skills, attribute plus proficiency. */
export const Modifier = Pg.smallint().brand<'Modifier'>();
export type Modifier = z.infer<typeof Modifier>;

/** A difficulty class a check is rolled against. */
export const Dc = Pg.smallint().nonnegative().brand<'Dc'>();
export type Dc = z.infer<typeof Dc>;

export const ArmorClass = Pg.smallint().nonnegative().brand<'ArmorClass'>();
export type ArmorClass = z.infer<typeof ArmorClass>;

/** Lowest and highest level anything has in the remastered rules (creatures span -1 to 25). */
export const LEVEL_MIN = -1;
export const LEVEL_MAX = 25;

/**
 * A character's or creature's level. Narrower ranges (a character's 1-20)
 * brand with the same name so they stay assignable to `Level`.
 */
export const Level = Pg.smallint().min(LEVEL_MIN).max(LEVEL_MAX).brand<'Level'>();
export type Level = z.infer<typeof Level>;
