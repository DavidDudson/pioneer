import * as z from 'zod';

import type { ValueOf } from './value-of';

/**
 * The typeface for running text. `Thematic` is the default: an old-style serif that suits the setting. The
 * others trade that for legibility (`Readable`, `Lexend`, `OpenDyslexic`) or defer to the device (`System`).
 */
export const BodyFont = {
  Thematic: 'thematic',
  Readable: 'readable',
  Lexend: 'lexend',
  OpenDyslexic: 'opendyslexic',
  System: 'system',
} as const;
export type BodyFont = ValueOf<typeof BodyFont>;
export const BodyFontSchema = z.enum(BodyFont);

/** The typeface for code, keys and numbers set in monospace. */
export const MonoFont = {
  Standard: 'standard',
  Typewriter: 'typewriter',
  System: 'system',
} as const;
export type MonoFont = ValueOf<typeof MonoFont>;
export const MonoFontSchema = z.enum(MonoFont);
