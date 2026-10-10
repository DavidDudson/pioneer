import * as z from 'zod';

import { Slug } from './content-id';
import { ContentKind, ContentKindSchema } from './content-kind';

/** A trait slug (`humanoid`, `undead`). Content defines the set, so it is a brand, not a const object. */
export const Trait = Slug.brand<'Trait'>();
export type Trait = z.infer<typeof Trait>;

/** What a creature is immune to: a damage type, condition or effect (`poison`, `paralyzed`, `death-effects`). */
export const Immunity = Slug.brand<'Immunity'>();
export type Immunity = z.infer<typeof Immunity>;

const KIND_COUNT = Object.keys(ContentKind).length;

/**
 * A trait's `data` on the `ContentEntry` envelope. The trait entry's slug is what entries list in `traits`; its
 * name and description are the envelope's.
 */
export const TraitData = z.strictObject({
  /** The kinds of entry that carry it, as Foundry pf2e files it (`manipulate` on actions, feats and spells). */
  appliesTo: z.array(ContentKindSchema).max(KIND_COUNT).readonly(),
});
export type TraitData = z.infer<typeof TraitData>;
