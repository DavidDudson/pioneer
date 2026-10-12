import { DamageTypeSchema, HeighteningType } from '@pioneer/rules/sdk';
import type { DamageType } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { fromFoundryFormula } from './foundry-formula';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';
import { boundedRecord } from './kind-fields';

/**
 * A spell's damage parts and heightening from Foundry's records. A part keeps Foundry's record key, lower-cased to a
 * slug, so heightening names the part it adds to. An `untyped` part has no damage type, a part that adds the caster's
 * spellcasting attribute modifier (`applyMod`) adds `@spellcasting.attr` to its formula, and its `materials` carry
 * over. Foundry also writes `untyped` for a type the caster chooses, with an overlay per choice (Gouging Claw's
 * slashing or piercing); such a part, like one with any other damage type Pioneer lacks, is reported and left out, and
 * so is what heightening adds to it.
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

/** Foundry's type for damage of no type. */
const UNTYPED = 'untyped';

/** The part types Foundry's overlays set, by overlay and then by part key. */
const FoundryOverlays = boundedRecord(
  z.looseObject({
    system: z
      .looseObject({ damage: boundedRecord(z.looseObject({ type: z.string().max(FIELD_MAX).optional() })).optional() })
      .optional(),
  }),
);

/**
 * The keys of the parts whose type an overlay sets: the caster chooses it, so Foundry's `untyped` there is a
 * placeholder, not damage of no type. Overlays that are not shaped as expected set none.
 */
export function chosenTypes(overlays: unknown): ReadonlySet<string> {
  const parsed = FoundryOverlays.safeParse(overlays ?? {});
  const variants = parsed.success ? Object.values(parsed.data) : [];
  return new Set(
    variants.flatMap(({ system }) =>
      Object.entries(system?.damage ?? {}).flatMap(([key, part]) => (part.type === undefined ? [] : [key])),
    ),
  );
}

/** What `applyMod` adds: the caster's spellcasting attribute modifier. */
const SPELLCASTING_MODIFIER = ' + @spellcasting.attr';

/** The key a part is named by: Foundry's record key, as a slug (`rQT6Is4x` to `rqt6is4x`). */
function partKey(key: string): string {
  return key.toLowerCase();
}

/** A damage part as translated, before the schema checks its formula and category. */
export interface DamagePart {
  readonly key: string;
  readonly formula: string;
  readonly damageType?: DamageType;
  readonly category?: string;
  readonly kinds: readonly string[];
  readonly materials?: readonly string[];
}

/** A part's damage type; none when it is untyped. */
interface PartType {
  readonly damageType?: DamageType;
}

/** The part's damage type, none when Foundry's is `untyped` and not chosen, or undefined when Pioneer lacks it. */
function damageTypeOf(type: string, chosen: boolean): PartType | undefined {
  if (type === UNTYPED) {
    return chosen ? undefined : {};
  }
  const damageType = DamageTypeSchema.safeParse(type);
  return damageType.success ? { damageType: damageType.data } : undefined;
}

/**
 * A damage part under its record key, or undefined when its type has no mapping; what it cannot carry is reported
 * against `<damage>.<key>`.
 */
function damagePart(
  [key, part]: readonly [string, FoundryDamagePart],
  { field: damage, chosen }: PartsField,
  log: GapLog,
): DamagePart | undefined {
  const field = `${damage}.${key}`;
  const damageType = damageTypeOf(part.type, chosen.has(key));
  if (damageType === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.type`, raw: part.type });
    return undefined;
  }
  const formula = fromFoundryFormula(part.formula);
  const materials = part.materials ?? [];
  return {
    key: partKey(key),
    formula: part.applyMod === true ? `${formula}${SPELLCASTING_MODIFIER}` : formula,
    ...damageType,
    ...(part.category === null || part.category === undefined ? {} : { category: part.category }),
    kinds: part.kinds ?? DEFAULT_KINDS,
    ...(materials.length > 0 ? { materials } : {}),
  };
}

/** Where a spell's damage parts are reported, and the keys of those whose type the caster chooses. */
export interface PartsField {
  readonly field: string;
  readonly chosen: ReadonlySet<string>;
}

/** The spell's damage parts in Foundry's order, each under `field.<key>`. */
export function damageParts(damage: FoundryDamage, at: PartsField, log: GapLog): DamagePart[] {
  return Object.entries(damage).flatMap((entry) => damagePart(entry, at, log) ?? []);
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
  readonly chosen: ReadonlySet<string>;
}

/** Fixed heightening's damage, each part Foundry overrides laid over the spell's own. */
export function heightenedDamage({ overrides, base, field, chosen }: DamageChanges, log: GapLog): DamagePart[] {
  const merged = { ...base };
  for (const [key, override] of Object.entries(overrides)) {
    const part = FoundryDamagePart.safeParse({ ...base[key], ...override });
    if (part.success) {
      merged[key] = part.data;
    } else {
      report(log, { reason: KindDataGapReason.InvalidData, field: `${field}.${key}`, raw: override });
    }
  }
  return damageParts(merged, { field, chosen }, log);
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
