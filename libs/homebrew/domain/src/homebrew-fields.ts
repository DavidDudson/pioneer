import * as z from 'zod';

/** How many entries a pack holds, as the content context counts them. */
export const EntryCount = z.int().nonnegative().brand<'EntryCount'>();
export type EntryCount = z.infer<typeof EntryCount>;

/** A pack with nothing in it yet. */
export const NO_ENTRIES = EntryCount.parse(0);
