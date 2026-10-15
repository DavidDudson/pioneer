import { ContentKind, DamageType, FundamentalRune, RunedItem, RuneType } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { resolveSlug } from './entry-references';
import { ETCHED_ONTO } from './entry-slugs';
import { asciiSlug } from './foundry-slug';
import { ENVELOPE_FIELDS, KindDataGapReason, report } from './kind-data-gaps';
import type { GapLog, KindInput } from './kind-data-gaps';
import { systemOf } from './kind-fields';
import { FoundryPhysicalSystem, PHYSICAL_FIELDS, physicalData } from './physical-fields';

/**
 * A rune's `data` from the Foundry `equipment` item with an `etched-onto-…` usage that stands for it (ADR-0023):
 * fundamental, with its rune and grade, or property, and what it is etched onto. What a property rune does Foundry
 * keeps in code (`RUNE_DATA`), so its `rules` are not taken from the item; the coverage report lists the runes without
 * them.
 */

export const RUNE_FIELDS: ReadonlySet<string> = new Set([...ENVELOPE_FIELDS, ...PHYSICAL_FIELDS, 'usage', 'baseItem']);

interface Fundamental {
  readonly rune: FundamentalRune;
  readonly grade: number;
  readonly item: RunedItem;
}

function grades(slugs: readonly string[], rune: FundamentalRune, item: RunedItem): [string, Fundamental][] {
  return slugs.map((slug, index) => [slug, { rune, grade: index + 1, item }]);
}

/** The fundamental runes, by Foundry's slug for the item: anything else etched is a property rune. */
const FUNDAMENTALS: ReadonlyMap<string, Fundamental> = new Map([
  ...grades(
    ['weapon-potency-1', 'weapon-potency-2', 'weapon-potency-3', 'weapon-potency-4'],
    FundamentalRune.Potency,
    RunedItem.Weapon,
  ),
  ...grades(
    ['armor-potency-1', 'armor-potency-2', 'armor-potency-3', 'armor-potency-4'],
    FundamentalRune.Potency,
    RunedItem.Armor,
  ),
  ...grades(
    ['striking', 'striking-greater', 'striking-major', 'striking-mythic'],
    FundamentalRune.Striking,
    RunedItem.Weapon,
  ),
  ...grades(
    ['resilient', 'resilient-greater', 'resilient-major', 'resilient-mythic'],
    FundamentalRune.Resilient,
    RunedItem.Armor,
  ),
  ...grades(
    [
      'reinforcing-rune-minor',
      'reinforcing-rune-lesser',
      'reinforcing-rune-moderate',
      'reinforcing-rune-greater',
      'reinforcing-rune-major',
      'reinforcing-rune-supreme',
    ],
    FundamentalRune.Reinforcing,
    RunedItem.Shield,
  ),
]);

interface EtchedOnto {
  readonly item: RunedItem;
  readonly restriction?: string;
}

/** What each `etched-onto-…` usage names: the item, and the restriction slug spelled out (`med-heavy` is `medium-or-heavy`). */
const ETCHINGS: ReadonlyMap<string, EtchedOnto> = new Map([
  ['a-weapon', { item: RunedItem.Weapon }],
  ['armor', { item: RunedItem.Armor }],
  ['a-shield', { item: RunedItem.Shield }],
  ['melee-weapon', { item: RunedItem.Weapon, restriction: 'melee' }],
  ['thrown-weapon', { item: RunedItem.Weapon, restriction: 'thrown' }],
  ['bludgeoning-weapon', { item: RunedItem.Weapon, restriction: 'bludgeoning' }],
  ['slashing-melee-weapon', { item: RunedItem.Weapon, restriction: 'slashing-melee' }],
  ['piercing-or-slashing-melee-weapon', { item: RunedItem.Weapon, restriction: 'piercing-or-slashing-melee' }],
  ['piercing-or-slashing-weapon', { item: RunedItem.Weapon, restriction: 'piercing-or-slashing' }],
  ['clan-dagger', { item: RunedItem.Weapon, restriction: 'clan-dagger' }],
  ['light-armor', { item: RunedItem.Armor, restriction: 'light' }],
  ['heavy-armor', { item: RunedItem.Armor, restriction: 'heavy' }],
  ['metal-armor', { item: RunedItem.Armor, restriction: 'metal' }],
  ['med-heavy-armor', { item: RunedItem.Armor, restriction: 'medium-or-heavy' }],
  ['medium-heavy-metal-armor', { item: RunedItem.Armor, restriction: 'medium-or-heavy-metal' }],
  ['lm-nonmetal-armor', { item: RunedItem.Armor, restriction: 'light-or-medium-nonmetal' }],
  // Foundry's labels for these two are swapped: the holy rune carries `wo-holy-rune` and goes on a weapon with no unholy rune.
  ['weapon-wo-holy-rune', { item: RunedItem.Weapon, restriction: 'without-unholy-rune' }],
  ['weapon-wo-unholy-rune', { item: RunedItem.Weapon, restriction: 'without-holy-rune' }],
]);

/** What a rune is etched onto; a usage naming no item is reported. */
function etchedOntoOf(usage: string, log: GapLog): EtchedOnto | undefined {
  const etched = ETCHINGS.get(usage.slice(ETCHED_ONTO.length));
  if (etched === undefined) {
    report(log, { reason: KindDataGapReason.UnmappedValue, field: 'usage', raw: usage });
  }
  return etched;
}

/** The rune's data, unparsed; undefined when its usage names nothing a rune is etched onto. */
export function runeData(input: KindInput): object | undefined {
  const system = systemOf(FoundryPhysicalSystem, input);
  const physical = system && physicalData(system, input);
  if (system === undefined || physical === undefined) {
    return undefined;
  }
  const etchedOnto = etchedOntoOf(system.usage?.value ?? '', input.log);
  if (etchedOnto === undefined) {
    return undefined;
  }
  const fundamental = FUNDAMENTALS.get(asciiSlug(input.document));
  return fundamental === undefined
    ? { ...physical, type: RuneType.Property, etchedOnto }
    : { ...physical, type: RuneType.Fundamental, rune: fundamental.rune, grade: fundamental.grade, etchedOnto };
}

/** The grade words Foundry puts first in a property rune's key (`greaterFlaming`) and last in its item's name. */
const GRADE_WORDS: ReadonlySet<string> = new Set([
  'minor',
  'lesser',
  'moderate',
  'greater',
  'major',
  'true',
  'supreme',
]);

/** A rune key's words: `greaterEnergyResistant` is `greater`, `energy`, `resistant`. */
const WORD = /[A-Z]?[a-z0-9]+/gu;

/** Property runes the remaster renamed, by the slug their legacy Foundry key spells (Speed is now Quickstrike). */
const RENAMED_RUNES: ReadonlyMap<string, string> = new Map([['speed', 'quickstrike']]);

/** Foundry's key for a property rune on an item (`greaterFlaming`) as its rune item's slug (`flaming-greater`). */
export function runeSlug(key: string): string {
  const words = (key.match(WORD) ?? []).map((word) => word.toLowerCase());
  const renamed = RENAMED_RUNES.get(words.join('-'));
  if (renamed !== undefined) {
    return renamed;
  }
  const [first, ...rest] = words;
  return first !== undefined && GRADE_WORDS.has(first) && rest.length > 0
    ? [...rest, first].join('-')
    : words.join('-');
}

/** The energies an energy-resistant rune is made for (GM Core); Foundry's legacy keys name one (`fireResistant`). */
const RUNE_ENERGIES: readonly DamageType[] = [
  DamageType.Acid,
  DamageType.Cold,
  DamageType.Electricity,
  DamageType.Fire,
];

/** A legacy energy-resistant key (`greaterAcidResistant`): its grade and the energy it names. */
const LEGACY_ENERGY_KEY = /^(?<grade>greater)?(?<energy>acid|cold|electricity|fire)Resistant$/iu;

/** The remaster rune a legacy energy-resistant key is, and the energy it was made for. */
interface LegacyEnergy {
  readonly slug: string;
  readonly energy: DamageType;
}

function legacyEnergy(key: string): LegacyEnergy | undefined {
  const { grade, energy } = LEGACY_ENERGY_KEY.exec(key)?.groups ?? {};
  const named = RUNE_ENERGIES.find((each) => each === energy?.toLowerCase());
  return named === undefined
    ? undefined
    : { slug: grade === undefined ? 'energy-resistant' : 'energy-resistant-greater', energy: named };
}

/** The property runes of an item: the `rune` entries Foundry's keys name, and the energy of those made for one. */
export interface PropertyRuneKeys {
  readonly property: ContentId[];
  readonly energy: Record<ContentId, DamageType>;
}

/** The `rune` entries Foundry's property rune keys name; one that names no entry is reported against `field`. */
export function propertyRunes(
  keys: readonly string[],
  field: string,
  { references, log }: KindInput,
): PropertyRuneKeys {
  const property: ContentId[] = [];
  const energy: Record<ContentId, DamageType> = {};
  for (const key of keys) {
    const legacy = legacyEnergy(key);
    const rune = resolveSlug(references, ContentKind.Rune, legacy?.slug ?? runeSlug(key));
    if (rune === undefined) {
      report(log, { reason: KindDataGapReason.UnresolvedReference, field, raw: key });
    } else {
      property.push(rune);
      if (legacy !== undefined) {
        energy[rune] = legacy.energy;
      }
    }
  }
  return { property, energy };
}
