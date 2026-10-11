import { DamageTypeSchema, HeighteningType } from '@pioneer/rules/sdk';
import type { DamageType } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { fromFoundryFormula } from './foundry-formula';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';
import { boundedRecord } from './kind-fields';

/**
 * A spell's damage parts and heightening from Foundry's records. A part keeps Foundry's record key, lower-cased to a
 * slug, so heightening names the part it adds to. A part with a damage type Pioneer lacks (`untyped`) is reported and
 * left out, and so is what heightening adds to it.
 */

const FIELD_MAX = 64;
const FORMULA_MAX = 200;
const LIST_MAX = 8;

const FoundryDamagePart = z.looseObject({
  formula: z.string().max(FORMULA_MAX),
  type: z.string().max(FIELD_MAX),
  category: z.string().max(FIELD_MAX).nullish(),
  kinds: z.array(z.string().max(FIELD_MAX)).max(LIST_MAX).optional(),
  applyMod: z.boolean().optional(),
  materials: z.array(z.string().max(FIELD_MAX)).max(LIST_MAX).optional(),
});
type FoundryDamagePart = z.infer<typeof FoundryDamagePart>;

export const FoundryDamage = boundedRecord(FoundryDamagePart);
export type FoundryDamage = z.infer<typeof FoundryDamage>;

/** Foundry's default for a part with no `kinds`. */
const DEFAULT_KINDS = ['damage'];

/** The key a part is named by: Foundry's record key, as a slug (`rQT6Is4x` to `rqt6is4x`). */
function partKey(key: string): string {
  return key.toLowerCase();
}

/** A damage part as translated, before the schema checks its formula and category. */
export interface DamagePart {
  readonly key: string;
  readonly formula: string;
  readonly damageType: DamageType;
  readonly category?: string;
  readonly kinds: readonly string[];
}

/**
 * A damage part under its record key, or undefined when its type has no mapping; what it cannot carry is reported
 * against `<damage>.<key>`.
 */
function damagePart(
  [key, part]: readonly [string, FoundryDamagePart],
  damage: string,
  log: GapLog,
): DamagePart | undefined {
  const field = `${damage}.${key}`;
  const damageType = DamageTypeSchema.safeParse(part.type);
  if (!damageType.success) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.type`, raw: part.type });
    return undefined;
  }
  if (part.applyMod === true) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.applyMod`, raw: part.applyMod });
  }
  if ((part.materials ?? []).length > 0) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.materials`, raw: part.materials });
  }
  return {
    key: partKey(key),
    formula: fromFoundryFormula(part.formula),
    damageType: damageType.data,
    ...(part.category === null || part.category === undefined ? {} : { category: part.category }),
    kinds: part.kinds ?? DEFAULT_KINDS,
  };
}

/** The spell's damage parts in Foundry's order, each under `field.<key>`. */
export function damageParts(damage: FoundryDamage, field: string, log: GapLog): DamagePart[] {
  return Object.entries(damage).flatMap((entry) => damagePart(entry, field, log) ?? []);
}

/** What fixed heightening overrides in each damage part, by its key. */
export const FoundryDamageOverrides = boundedRecord(FoundryDamagePart.partial());
export type FoundryDamageOverrides = z.infer<typeof FoundryDamageOverrides>;

export const FoundryHeightening = z.looseObject({
  type: z.string().max(FIELD_MAX).optional(),
  interval: z.number().optional(),
  damage: boundedRecord(z.string().max(FORMULA_MAX)).optional(),
  area: z.number().optional(),
  levels: boundedRecord(z.looseObject({})).optional(),
});
export type FoundryHeightening = z.infer<typeof FoundryHeightening>;

/** "Heightened (+1)": what each step adds to the parts the spell kept, and feet to the area. */
function intervalOf(heightening: FoundryHeightening, kept: ReadonlySet<string>): object {
  const damage = Object.entries(heightening.damage ?? {})
    .filter(([key]) => kept.has(partKey(key)))
    .map(([key, formula]) => ({ key: partKey(key), formula: fromFoundryFormula(formula) }));
  const area = heightening.area ?? 0;
  return {
    type: HeighteningType.Interval,
    interval: heightening.interval,
    damage,
    ...(area > 0 ? { area } : {}),
  };
}

/** What a fixed rank changes, translated; the casting fields' parsers come from the spell. */
export type RankChanges = (changes: Readonly<Record<string, unknown>>, field: string) => object;

/**
 * "Heightened (4th)": each rank's changes, in rank order. A rank left with no change Pioneer maps is left out; what
 * it could not carry is already reported against its fields.
 */
function fixedOf(heightening: FoundryHeightening, changesOf: RankChanges): object | undefined {
  const ranks = Object.entries(heightening.levels ?? {})
    .toSorted(([left], [right]) => Number(left) - Number(right))
    .flatMap(([rank, changes]) => {
      const mapped = changesOf(changes, `heightening.levels.${rank}`);
      return Object.keys(mapped).length === 0 ? [] : [{ rank: Number(rank), ...mapped }];
    });
  return ranks.length === 0 ? undefined : { type: HeighteningType.Fixed, ranks };
}

/** What fixed heightening changes in a spell's damage, at `field`. */
export interface DamageChanges {
  readonly overrides: FoundryDamageOverrides;
  readonly base: FoundryDamage;
  readonly field: string;
}

/** Fixed heightening's damage, each part Foundry overrides laid over the spell's own. */
export function heightenedDamage({ overrides, base, field }: DamageChanges, log: GapLog): DamagePart[] {
  const merged = { ...base };
  for (const [key, override] of Object.entries(overrides)) {
    const part = FoundryDamagePart.safeParse({ ...base[key], ...override });
    if (part.success) {
      merged[key] = part.data;
    } else {
      report(log, { reason: KindDataGapReason.InvalidData, field: `${field}.${key}`, raw: override });
    }
  }
  return damageParts(merged, field, log);
}

export interface HeighteningInput {
  readonly heightening: FoundryHeightening;
  /** The keys of the damage parts the spell kept. */
  readonly kept: ReadonlySet<string>;
  readonly changesOf: RankChanges;
  readonly log: GapLog;
}

/** The spell's heightening, or undefined when Foundry's has no type Pioneer has, or a fixed one changes nothing. */
export function heighteningOf({ heightening, kept, changesOf, log }: HeighteningInput): object | undefined {
  if (heightening.type === HeighteningType.Interval) {
    return intervalOf(heightening, kept);
  }
  if (heightening.type === HeighteningType.Fixed) {
    return fixedOf(heightening, changesOf);
  }
  report(log, { reason: KindDataGapReason.UnmappedValue, field: 'heightening', raw: heightening });
  return undefined;
}

/** The keys of the parts `damageParts` kept. */
export function partKeys(parts: readonly DamagePart[]): ReadonlySet<string> {
  return new Set(parts.map(({ key }) => key));
}
