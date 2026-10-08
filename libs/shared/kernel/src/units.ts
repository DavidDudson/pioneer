import type { z } from 'zod';

import { Pg } from './pg';

/**
 * Branded units of measure. The brand carries the unit, so names don't repeat
 * it (`REVERT_WINDOW: Milliseconds`, not `REVERT_WINDOW_MS`).
 */
export const Milliseconds = Pg.integer().nonnegative().brand<'Milliseconds'>();
export type Milliseconds = z.infer<typeof Milliseconds>;
