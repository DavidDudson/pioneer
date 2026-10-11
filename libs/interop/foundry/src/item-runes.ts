import * as z from 'zod';

import type { KindInput } from './kind-data-gaps';
import { boundedRecord } from './kind-fields';
import { propertyRunes } from './translate-rune';

/**
 * The runes a specific magic weapon or armour comes with, from Foundry's `runes`: fundamental grades as numbers (0 is
 * none) and property runes by Foundry's key (`greaterFlaming`), each resolved to its `rune` entry.
 */

const FIELD_MAX = 64;
const PROPERTY_MAX = 8;

const RuneKey = z.string().max(FIELD_MAX);

export const FoundryRunes = z.looseObject({
  potency: z.number().nullish(),
  striking: z.number().nullish(),
  resilient: z.number().nullish(),
  reinforcing: z.number().nullish(),
  // A few documents write an empty record (`{ "0": "" }`) for no property runes.
  property: z
    .union([z.array(RuneKey).max(PROPERTY_MAX), boundedRecord(RuneKey)])
    .transform((keys) => Object.values(keys).filter((key) => key !== ''))
    .default([]),
});
export type FoundryRunes = z.infer<typeof FoundryRunes>;

/** The fundamental runes an item kind has: a weapon's potency and striking, armour's potency and resilient. */
export type GradeKey = 'potency' | 'striking' | 'resilient';

/** The item's runes, with the fundamental grades it has and its property runes; undefined when it has none. */
export function itemRunes(runes: FoundryRunes, keys: readonly GradeKey[], input: KindInput): object | undefined {
  const grades = keys.flatMap((key) => {
    const grade = runes[key] ?? 0;
    return grade > 0 ? [[key, grade] as const] : [];
  });
  const property = propertyRunes(runes.property, 'runes.property', input);
  return grades.length === 0 && runes.property.length === 0 ? undefined : { ...Object.fromEntries(grades), property };
}
