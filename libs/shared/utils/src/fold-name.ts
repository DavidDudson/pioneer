const MARKS = /\p{Mark}/gu;
const MARKS_AND_DIACRITICS = /[\p{Mark}\p{Diacritic}]/gu;
const APOSTROPHES = /['’‘`]/gu;
const NOT_ALPHANUMERIC = /[^\p{Letter}\p{Number}]+/gu;

/** `text` with its accents and other combining marks removed: `déjà-vu` is `deja-vu`. Case and punctuation stay. */
export function foldDiacritics(text: string): string {
  return text.normalize('NFKD').replaceAll(MARKS, '');
}

/**
 * The one key for asking whether two names mean the same entry. Case, accents, apostrophes and punctuation are
 * ignored, so "Healing Potion (Moderate)" meets "Healing Potion, Moderate" and "Nature’s Reprisal" meets
 * "Nature's Reprisal". Words are separated by one space.
 */
export function foldName(name: string): string {
  return name
    .normalize('NFKD')
    .replaceAll(MARKS_AND_DIACRITICS, '')
    .replaceAll(APOSTROPHES, '')
    .toLowerCase()
    .replaceAll(NOT_ALPHANUMERIC, ' ')
    .trim();
}
