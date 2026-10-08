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
