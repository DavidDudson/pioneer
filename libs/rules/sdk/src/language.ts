import * as z from 'zod';

/** A language's `data` on the `ContentEntry` envelope: none yet. Its rarity is the envelope's. */
export const LanguageData = z.strictObject({});
export type LanguageData = z.infer<typeof LanguageData>;
