import * as z from 'zod';

import { KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog } from './kind-data-gaps';
import { boundedRecord, setFields } from './kind-fields';
import { FoundryDamageOverrides, FoundryHeightening, heightenedDamage, heighteningOf, partKeys } from './spell-damage';
import type { FoundryDamage, RankChanges } from './spell-damage';
import { defenseOf, FIELD_MAX, FoundryDefense, FoundryText, reachOf, TEXT_MAX, timeAt } from './spell-reach';

/**
 * What a spell changes beyond its own fields: a fixed rank of its heightening, and its variants (Foundry's `override`
 * overlays). Both set casting fields, damage and heightening, which map as the spell's do; what they set that
 * Pioneer has no field for is reported.
 */

const TRAITS_MAX = 16;

/** What fixed heightening may change at a rank. */
const RANK_CHANGES: ReadonlySet<string> = new Set(['area', 'damage', 'duration', 'range', 'target', 'time', 'traits']);

const FoundryTraits = z.looseObject({ value: z.array(z.string().max(FIELD_MAX)).max(TRAITS_MAX) });

/** How a fixed rank's changes translate: as the spell's own fields, its damage laid over the spell's. */
export function rankChanges(base: FoundryDamage, log: GapLog): RankChanges {
  return (changes, field) => {
    const overrides = FoundryDamageOverrides.safeParse(changes['damage']).data;
    const traits = FoundryTraits.safeParse(changes['traits']).data;
    for (const key of Object.keys(changes).filter((each) => !RANK_CHANGES.has(each))) {
      report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.${key}`, raw: changes[key] });
    }
    return {
      ...reachOf(changes, `${field}.`, log),
      ...setFields({
        time: timeAt(changes['time'], `${field}.time`, log),
        traits: traits && [...new Set(traits.value)],
        damage: overrides && heightenedDamage({ overrides, base, field: `${field}.damage` }, log),
      }),
    };
  };
}

/** One overlay: Foundry's `override` replaces fields of the spell; other types are reported. */
const FoundryOverlay = z.looseObject({
  name: z.string().max(TEXT_MAX).optional(),
  overlayType: z.string().max(FIELD_MAX),
  sort: z.number().optional(),
  system: z.record(z.string(), z.unknown()).default({}),
});
type FoundryOverlay = z.infer<typeof FoundryOverlay>;

const FoundryOverlays = boundedRecord(FoundryOverlay);

const OVERRIDE = 'override';

/** What an overlay may set: the casting fields, defence, damage and heightening. */
const OVERLAY_FIELDS: ReadonlySet<string> = new Set([
  'area',
  'damage',
  'defense',
  'duration',
  'heightening',
  'range',
  'target',
  'time',
]);

/** The spell its variants overlay: what of its Foundry `system` they lay over, and the damage parts it kept. */
export interface VariantSpell {
  readonly range?: z.infer<typeof FoundryText> | null | undefined;
  readonly target?: z.infer<typeof FoundryText> | null | undefined;
  readonly defense?: z.infer<typeof FoundryDefense> | null | undefined;
  readonly damage: FoundryDamage;
  readonly heightening?: FoundryHeightening | null | undefined;
  readonly kept: ReadonlySet<string>;
}

/** An overlay, and where it is reported. */
interface OverlayAt {
  readonly spell: VariantSpell;
  readonly system: Readonly<Record<string, unknown>>;
  readonly field: string;
  readonly log: GapLog;
}

/** An overlay's heightening laid over the spell's, its damage record merged by part key. */
function variantHeightening(overlay: unknown, { heightening }: VariantSpell): FoundryHeightening | undefined {
  const over = FoundryHeightening.safeParse(overlay).data;
  const base = heightening ?? undefined;
  return over && { ...base, ...over, damage: { ...base?.damage, ...over.damage } };
}

/** The defence an overlay sets; `null` removes the spell's, which a variant can't, so it is reported. */
function variantDefense({ spell, system, field, log }: OverlayAt): object | undefined {
  const { defense } = system;
  if (defense === null && spell.defense !== null && spell.defense !== undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.defense`, raw: defense });
  }
  const parsed = FoundryDefense.safeParse(defense).data;
  return parsed && defenseOf({ ...spell.defense, ...parsed }, log);
}

/** A variant's casting fields, defence, damage and heightening. */
function variantFields(at: OverlayAt): object {
  const { spell, system, field, log } = at;
  const overrides = FoundryDamageOverrides.safeParse(system['damage']).data;
  const damage = overrides && heightenedDamage({ overrides, base: spell.damage, field: `${field}.damage` }, log);
  const heightening = variantHeightening(system['heightening'], spell);
  const kept = damage ? partKeys(damage) : spell.kept;
  return {
    ...reachOf(system, `${field}.`, log),
    ...setFields({
      time: timeAt(system['time'], `${field}.time`, log),
      defense: variantDefense(at),
      damage,
      heightening: heightening && heighteningOf({ heightening, kept, changesOf: rankChanges(spell.damage, log), log }),
    }),
  };
}

/** Whether an overlay blanks `text`, which the spell has. */
function isBlanked(overlay: unknown, text: z.infer<typeof FoundryText> | null | undefined): boolean {
  const blanked = FoundryText.safeParse(overlay).data?.value.trim() === '';
  return blanked && text !== null && text !== undefined && text.value.trim() !== '';
}

/** What an overlay sets that a variant can't hold: other fields, and a range or target it removes (Heal's 3 actions). */
function reportUnmapped({ spell, system, field, log }: OverlayAt): void {
  for (const key of Object.keys(system).filter((each) => !OVERLAY_FIELDS.has(each))) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: `${field}.${key}`, raw: system[key] });
  }
  const blankable = { range: spell.range, target: spell.target };
  for (const [key, text] of Object.entries(blankable)) {
    if (isBlanked(system[key], text)) {
      report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.${key}.value`, raw: '' });
    }
  }
}

/** An overlay with its id. */
interface OverlayEntry {
  readonly id: string;
  readonly overlay: FoundryOverlay;
}

/** A variant from one overlay; undefined when it is not an override or sets nothing Pioneer maps. */
function variantOf({ id, overlay }: OverlayEntry, spell: VariantSpell, log: GapLog): object | undefined {
  const field = `overlays.${id}`;
  if (overlay.overlayType !== OVERRIDE) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: `${field}.overlayType`, raw: overlay.overlayType });
    return undefined;
  }
  const at = { spell, system: overlay.system, field, log };
  reportUnmapped(at);
  const fields = variantFields(at);
  const name = overlay.name?.trim() ?? '';
  return Object.keys(fields).length === 0
    ? undefined
    : { ...setFields({ name: name === '' ? undefined : name }), ...fields };
}

/** A spell's variants in Foundry's order; undefined when it has none, or none that map. */
export function variantsOf(overlays: unknown, spell: VariantSpell, log: GapLog): readonly object[] | undefined {
  if (overlays === undefined || overlays === null) {
    return undefined;
  }
  const parsed = FoundryOverlays.safeParse(overlays);
  if (!parsed.success) {
    report(log, { reason: KindDataGapReason.InvalidData, field: 'overlays', raw: overlays });
    return undefined;
  }
  const variants = Object.entries(parsed.data)
    .toSorted(([, left], [, right]) => (left.sort ?? 0) - (right.sort ?? 0))
    .flatMap(([id, overlay]) => variantOf({ id, overlay }, spell, log) ?? []);
  return variants.length === 0 ? undefined : variants;
}
