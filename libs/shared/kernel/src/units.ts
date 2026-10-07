import type { z } from 'zod';

import { Pg } from './pg';

/**
 * Branded units of measure. A value's unit lives in its type *and* its name
 * (`savedFlashMs: Milliseconds`); lint enforces the name half.
 */
export const Milliseconds = Pg.integer().nonnegative().brand<'Milliseconds'>();
export type Milliseconds = z.infer<typeof Milliseconds>;
