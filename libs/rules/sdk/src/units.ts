import { Pg } from '@pioneer/shared/kernel';
import type { z } from 'zod';

/**
 * Game units of measure, branded so a speed can't be added to a hit point
 * total. Names carry the unit too (`speedFeet`), enforced by lint.
 */
export const Feet = Pg.smallint().nonnegative().brand<'Feet'>();
export type Feet = z.infer<typeof Feet>;

export const HitPoints = Pg.smallint().nonnegative().brand<'HitPoints'>();
export type HitPoints = z.infer<typeof HitPoints>;
