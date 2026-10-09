import { z } from 'zod';

import type { ValueOf } from './value-of';

/** Locales Pioneer ships UI messages for. */
export const Locale = {
  English: 'en',
} as const;
export type Locale = ValueOf<typeof Locale>;
export const LocaleSchema = z.enum(Locale);

/** Messages are authored in this locale; every other locale falls back to it per key. */
export const SOURCE_LOCALE = Locale.English;

export const TextDirection = {
  LeftToRight: 'ltr',
  RightToLeft: 'rtl',
} as const;
export type TextDirection = ValueOf<typeof TextDirection>;

/** Languages written right to left, by primary language subtag. */
const RIGHT_TO_LEFT = new Set(['ar', 'ckb', 'dv', 'fa', 'he', 'ps', 'sd', 'ug', 'ur', 'yi']);

function language(tag: string): string {
  return tag.split('-')[0]?.toLowerCase() ?? '';
}

export function textDirection(locale: string): TextDirection {
  return RIGHT_TO_LEFT.has(language(locale)) ? TextDirection.RightToLeft : TextDirection.LeftToRight;
}
