import * as z from 'zod';

/** The longest name a custom language keeps. */
export const LANGUAGE_NAME_MAX_LENGTH = 80;

/** The most custom languages a build keeps. */
export const CUSTOM_LANGUAGES_MAX = 100;

/** A language no loaded content defines, as its name is written: `Wildsong`. */
export const LanguageName = z.string().trim().min(1).max(LANGUAGE_NAME_MAX_LENGTH).brand<'LanguageName'>();
export type LanguageName = z.infer<typeof LanguageName>;

/** Whether two names are one language: the same letters, whatever the case. */
function sameName(left: LanguageName, right: LanguageName): boolean {
  return left.localeCompare(right, 'en', { sensitivity: 'base' }) === 0;
}

/** `names` that are valid, each language once and the first spelling kept, at most `CUSTOM_LANGUAGES_MAX`. */
export function customLanguagesOf(names: readonly unknown[]): readonly LanguageName[] {
  const kept: LanguageName[] = [];
  for (const raw of names) {
    const name = LanguageName.safeParse(raw);
    if (name.success && !kept.some((each) => sameName(each, name.data))) {
      kept.push(name.data);
    }
  }
  return kept.slice(0, CUSTOM_LANGUAGES_MAX);
}
