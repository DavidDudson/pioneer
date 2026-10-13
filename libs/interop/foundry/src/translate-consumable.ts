import { ConsumableCategory, ContentKind, DamageTypeSchema } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { resolveSlug } from './entry-references';
import { fromFoundryFormula } from './foundry-formula';
import { asciiNameSlug } from './foundry-slug';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { setFields, systemOf } from './kind-fields';
import { FoundryPhysicalSystem, PHYSICAL_FIELDS, physicalData, stackSize, usageField } from './physical-fields';

/**
 * A consumable's `data` from Foundry's `consumable` item, and ammunition's from its `ammo` item (ADR-0023): category,
 * uses, the damage or healing it rolls, the spell a scroll or wand holds, and the kinds ammunition can be fired as.
 */

export const CONSUMABLE_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...PHYSICAL_FIELDS,
  'usage',
  'category',
  'uses',
  'damage',
  'spell',
]);

export const AMMO_FIELDS: ReadonlySet<string> = new Set([
  ...ENVELOPE_FIELDS,
  ...PHYSICAL_FIELDS,
  'baseItem',
  'uses',
  'craftableAs',
]);

const FIELD_MAX = 64;
const NAME_MAX = 500;
const FORMULA_MAX = 200;
const AMMUNITION_MAX = 8;

const FoundryUses = z.looseObject({ max: z.number().nullish(), autoDestroy: z.boolean().nullish() }).nullish();
type FoundryUses = z.infer<typeof FoundryUses>;

/** The spell a scroll or wand holds: Foundry embeds the whole spell document, with the rank it is cast at. */
const FoundrySpellLevel = z.looseObject({ value: z.number() });
const FoundrySpellLocation = z.looseObject({ heightenedLevel: z.number().nullish() });
const FoundryHeldSpell = z.looseObject({
  name: z.string().max(NAME_MAX),
  system: z.looseObject({
    slug: z.string().max(NAME_MAX).nullish(),
    level: FoundrySpellLevel,
    location: FoundrySpellLocation.nullish(),
  }),
});
type FoundryHeldSpell = z.infer<typeof FoundryHeldSpell>;

const FoundryConsumableDamage = z.looseObject({
  formula: z.string().max(FORMULA_MAX),
  type: z.string().max(FIELD_MAX),
  kind: z.string().max(FIELD_MAX),
});
type FoundryConsumableDamage = z.infer<typeof FoundryConsumableDamage>;

const FoundryConsumableSystem = FoundryPhysicalSystem.extend({
  category: z.string().max(FIELD_MAX),
  uses: FoundryUses,
  damage: FoundryConsumableDamage.nullish(),
  spell: FoundryHeldSpell.nullish(),
  usage: z.looseObject({ value: z.string().max(NAME_MAX).nullish(), canBeAmmo: z.boolean().nullish() }).nullish(),
});

const FoundryAmmoSystem = FoundryPhysicalSystem.extend({
  baseItem: z.string().max(FIELD_MAX).nullish(),
  uses: FoundryUses,
  craftableAs: z.array(z.string().max(FIELD_MAX)).max(AMMUNITION_MAX).nullish(),
});

/** Used up after one use unless Foundry gives more; `kept` when Foundry keeps it once spent (a wand). */
function usesOf(uses: FoundryUses): object {
  const max = uses?.max ?? 1;
  return setFields({ uses: max > 1 ? max : undefined, kept: uses?.autoDestroy === false ? true : undefined });
}

/** Foundry's name for damage or healing of no type. */
const UNTYPED = 'untyped';

/** The damage or healing it rolls; `untyped` has no type, and any other type Pioneer lacks is reported and left out. */
function damageOf(damage: FoundryConsumableDamage, log: GapLog): object | undefined {
  if (damage.type === UNTYPED) {
    return { formula: fromFoundryFormula(damage.formula), kind: damage.kind };
  }
  const damageType = DamageTypeSchema.safeParse(damage.type);
  if (!damageType.success) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'damage.type', raw: damage.type });
    return undefined;
  }
  return { formula: fromFoundryFormula(damage.formula), damageType: damageType.data, kind: damage.kind };
}

/** The held spell as its `spell` entry, at the rank it is cast; one that names no entry is reported. */
function spellOf(held: FoundryHeldSpell, { references, log }: KindInput): object | undefined {
  const slug = asciiNameSlug(held.system.slug ?? held.name);
  const spell = resolveSlug(references, ContentKind.Spell, slug);
  if (spell === undefined) {
    report(log, { reason: KindDataGapReason.UnresolvedReference, field: 'spell', raw: slug });
    return undefined;
  }
  return { spell, rank: held.system.location?.heightenedLevel ?? held.system.level.value };
}

/** The consumable's data, unparsed; undefined when its `system` is not shaped as one's or its Bulk does not map. */
export function consumableData(input: KindInput): object | undefined {
  const system = systemOf(FoundryConsumableSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  const { log } = input;
  if (system.usage?.canBeAmmo === true) {
    report(log, { reason: KindDataGapReason.UnmappedField, field: 'usage.canBeAmmo', raw: true });
  }
  return {
    ...physical,
    category: system.category,
    ...usesOf(system.uses),
    ...usageField(system, log),
    ...setFields({
      damage: system.damage ? damageOf(system.damage, log) : undefined,
      spell: system.spell ? spellOf(system.spell, input) : undefined,
    }),
  };
}

/**
 * Ammunition's data, unparsed: a consumable of the `ammunition` category, fired as the kinds Foundry crafts it as, or
 * the one kind it is; none when Foundry lists none, so it fits any weapon that doesn't take a magazine. Its Bulk is for
 * a stack of its kind (ten arrows are light).
 */
export function ammoData(input: KindInput): object | undefined {
  const system = systemOf(FoundryAmmoSystem, input);
  const baseItem = system?.baseItem ?? undefined;
  const physical = system && physicalData(system, input, stackSize(baseItem));
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  const kinds = system.craftableAs ?? (baseItem === undefined ? [] : [baseItem]);
  return {
    ...physical,
    category: ConsumableCategory.Ammunition,
    ...usesOf(system.uses),
    ...setFields({ ammunition: kinds.length > 0 ? kinds : undefined }),
  };
}
