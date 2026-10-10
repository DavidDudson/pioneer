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

/** Foundry's `system.publication`: which book an entry comes from, its licence, and whether it is remaster. */
export const FoundryPublication = z.looseObject({
  // Foundry has a few titles with stray whitespace (" Pathfinder Treasure Vault (Remastered)").
  title: z.string().trim().max(TITLE_MAX),
  license: z.string().max(TITLE_MAX).optional(),
  remaster: z.boolean().default(false),
});
export type FoundryPublication = z.infer<typeof FoundryPublication>;

export const FoundryDocument = z.looseObject({
  _id: z.string().min(1).max(ID_MAX),
  name: z.string().max(NAME_MAX),
  type: z.string().min(1).max(TYPE_MAX),
  system: z.looseObject({
    publication: FoundryPublication.optional(),
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
