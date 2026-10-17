import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

/**
 * The fields of a Foundry pf2e document the importer reads, from the pack sources in the system repository
 * (`packs/pf2e/<pack>/**.json`). Foundry publishes no schema and adds fields between releases, so every object is
 * loose: only what selection needs is required, and everything else is carried through untouched for the
 * translation stories.
 */

const ID_MAX = 64;
const NAME_MAX = 500;
const TYPE_MAX = 64;
const TITLE_MAX = 500;
const TRAITS_MAX = 100;
const RULES_MAX = 500;
/** Ten times the longest description at `pf2e-8.6.0` (about 9,500 characters). */
const DESCRIPTION_MAX = 100_000;

/** Foundry's `system.publication`: which book an entry comes from, its licence, and whether it is remaster. */
export const FoundryPublication = z.looseObject({
  // Foundry has a few titles with stray whitespace (" Pathfinder Treasure Vault (Remastered)").
  title: z.string().trim().max(TITLE_MAX),
  license: z.string().max(TITLE_MAX).optional(),
  remaster: z.boolean().default(false),
});
export type FoundryPublication = z.infer<typeof FoundryPublication>;

/** Foundry's `system.traits`: trait slugs as Foundry spells them, and a rarity (absent on a few item types). */
export const FoundryTraits = z.looseObject({
  value: z.array(z.string().max(TYPE_MAX)).max(TRAITS_MAX).default([]),
  rarity: z.string().max(TYPE_MAX).optional(),
});
export type FoundryTraits = z.infer<typeof FoundryTraits>;

/** Foundry's `system.level`; for a spell, its rank. */
const FoundryLevel = z.looseObject({ value: z.number() });

const FoundryRules = z.array(z.unknown()).max(RULES_MAX);

/** Foundry's `system.description`: HTML with enrichers, converted by `htmlToRichText`. */
const FoundryDescription = z.looseObject({ value: z.string().max(DESCRIPTION_MAX).default('') });

export const FoundryDocument = z.looseObject({
  _id: z.string().min(1).max(ID_MAX),
  name: z.string().max(NAME_MAX),
  type: z.string().min(1).max(TYPE_MAX),
  system: z.looseObject({
    publication: FoundryPublication.optional(),
    /** Set on a handful of documents; Foundry derives the rest from the name (`foundrySlug`). */
    slug: z.string().max(NAME_MAX).nullish(),
    level: FoundryLevel.optional(),
    traits: FoundryTraits.optional(),
    description: FoundryDescription.optional(),
    /** Raw rule elements, each checked against Pioneer's `RuleElement` when the entry is translated. */
    rules: FoundryRules.default([]),
  }),
});
export type FoundryDocument = z.infer<typeof FoundryDocument>;

/**
 * Foundry item types the importer translates, each to one Pioneer kind (or several, by `category`). Every other
 * type in an item pack (`campaignFeature`, and anything Foundry adds later) is skipped as unsupported.
 */
export const FoundryItemType = {
  Action: 'action',
  Ammo: 'ammo',
  Ancestry: 'ancestry',
  Armor: 'armor',
  Backpack: 'backpack',
  Background: 'background',
  Class: 'class',
  Condition: 'condition',
  Consumable: 'consumable',
  Deity: 'deity',
  Effect: 'effect',
  Equipment: 'equipment',
  Feat: 'feat',
  Heritage: 'heritage',
  Kit: 'kit',
  Shield: 'shield',
  Spell: 'spell',
  Treasure: 'treasure',
  Weapon: 'weapon',
} as const;
export type FoundryItemType = ValueOf<typeof FoundryItemType>;

const ITEM_TYPES: ReadonlySet<string> = new Set(Object.values(FoundryItemType));

export function isFoundryItemType(type: string): type is FoundryItemType {
  return ITEM_TYPES.has(type);
}

const ITEMS_MAX = 500;

/** Foundry's `system.details` on an actor: where it was published, and its level. */
const FoundryActorDetails = z.looseObject({
  publication: FoundryPublication.optional(),
  level: FoundryLevel.optional(),
});

/** An item embedded in an actor: a strike, an ability, a spellcasting entry, a spell or carried gear. */
const FoundryEmbeddedItem = z.looseObject({
  _id: z.string().min(1).max(ID_MAX),
  name: z.string().max(NAME_MAX),
  type: z.string().min(1).max(TYPE_MAX),
});

/**
 * A document of an actor pack (`packs/pf2e/<bestiary>/**.json`), read as loosely as an item: what selection needs is
 * required, and the rest is carried through for the creature translation stories. The publication sits in
 * `system.details`, not `system` as for an item.
 */
export const FoundryActor = z.looseObject({
  _id: z.string().min(1).max(ID_MAX),
  name: z.string().max(NAME_MAX),
  type: z.string().min(1).max(TYPE_MAX),
  system: z.looseObject({
    details: FoundryActorDetails.default({}),
    traits: FoundryTraits.optional(),
  }),
  items: z.array(FoundryEmbeddedItem).max(ITEMS_MAX).default([]),
});
export type FoundryActor = z.infer<typeof FoundryActor>;

/**
 * Foundry actor types the importer reads. Monster Core and the adventure bestiaries use `npc` for every creature;
 * `hazard` is a later kind.
 */
export const FoundryActorType = { Npc: 'npc', Hazard: 'hazard' } as const;
export type FoundryActorType = ValueOf<typeof FoundryActorType>;
