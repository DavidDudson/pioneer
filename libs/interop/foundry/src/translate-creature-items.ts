import * as z from 'zod';

import { Count, embeddedOf, itemsOfType, itemSystem } from './creature-embedded';
import type { Embedded } from './creature-embedded';
import { resolveSlug } from './entry-references';
import { FOUNDRY_TYPE_KINDS } from './entry-slugs';
import { isFoundryItemType } from './foundry-document';
import { slugify } from './foundry-slug';
import { KindDataGapReason, report } from './kind-data-gaps';
import type { KindInput } from './kind-data-gaps';
import { abilitiesOf } from './translate-creature-abilities';
import { spellcastingOf } from './translate-creature-spellcasting';
import { strikesOf } from './translate-creature-strikes';

/**
 * A creature's embedded Foundry items as stat block parts: `melee` items are strikes, `action` items abilities,
 * `spellcastingEntry` items with their `spell` items spellcasting, `lore` items skills, carried gear items, and
 * `condition` items conditions. What has no place (an `effect` item, a spell no pack has) is reported against the
 * entry with its name, never invented.
 */

const FoundryLore = z.looseObject({ mod: Count });
const FoundryGear = z.looseObject({ quantity: z.number().default(1) });

const GEAR_TYPES: ReadonlySet<string> = new Set([
  'weapon',
  'armor',
  'shield',
  'equipment',
  'consumable',
  'treasure',
  'backpack',
  'ammo',
]);

interface LoreSkill {
  readonly skill: string;
  readonly modifier: number;
}

/** A Lore among the items, as a skill modifier beside the creature's own `skills`. */
function loreOf(item: Embedded, input: KindInput): LoreSkill | undefined {
  const system = itemSystem(FoundryLore, item, input);
  return system === undefined ? undefined : { skill: slugify(item.name), modifier: system.mod.value };
}

interface GearItem {
  readonly item: string;
  readonly quantity?: number;
}

/** Carried gear linked to its equipment entry; reported by name when no entry has it. */
function gearOf(item: Embedded, input: KindInput): GearItem | undefined {
  const system = itemSystem(FoundryGear, item, input);
  const kind = isFoundryItemType(item.type) ? FOUNDRY_TYPE_KINDS[item.type] : undefined;
  const found = kind === undefined ? undefined : resolveSlug(input.references, kind, slugify(item.name));
  if (found === undefined) {
    report(input.log, { reason: KindDataGapReason.UnresolvedReference, field: 'items', raw: item.name });
    return undefined;
  }
  return { item: found, ...(system === undefined || system.quantity === 1 ? {} : { quantity: system.quantity }) };
}

/** The stat block parts the embedded items make; each list is absent when empty. */
export function creatureItems(input: KindInput): Readonly<Record<string, readonly unknown[]>> {
  const items = embeddedOf(input);
  for (const item of itemsOfType(items, 'effect')) {
    report(input.log, { reason: KindDataGapReason.UnmappedField, field: 'items.effect', raw: item.name });
  }
  const parts = {
    strikes: strikesOf(items, input),
    abilities: abilitiesOf(items, input),
    spellcasting: spellcastingOf(items, input),
    items: items.filter(({ type }) => GEAR_TYPES.has(type)).flatMap((item) => gearOf(item, input) ?? []),
    lores: itemsOfType(items, 'lore').flatMap((item) => loreOf(item, input) ?? []),
    conditions: itemsOfType(items, 'condition').map((item) => slugify(item.name)),
  };
  return Object.fromEntries(Object.entries(parts).filter(([, list]) => list.length > 0));
}
