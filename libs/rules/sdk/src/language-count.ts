import { Pg } from '@pioneer/shared/kernel';
import type * as z from 'zod';

/** How many languages a character picks from one source. */
export const LanguageCount = Pg.smallint().nonnegative().brand<'LanguageCount'>();

export type LanguageCount = z.infer<typeof LanguageCount>;
