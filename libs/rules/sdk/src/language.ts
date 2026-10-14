import * as z from 'zod';

/** The writing system a language is written in, which languages can share. */
export const LanguageScript = z.string().min(1).brand<'LanguageScript'>();
export type LanguageScript = z.infer<typeof LanguageScript>;

/** A language's `data` on the `ContentEntry` envelope. Its rarity is the envelope's; its script is absent where the rules give none. */
export const LanguageData = z.strictObject({ script: LanguageScript.optional() });
export type LanguageData = z.infer<typeof LanguageData>;
