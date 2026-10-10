import * as z from 'zod';

import { ContentId } from './content-id';

/**
 * An archetype's `data` on the `ContentEntry` envelope. Foundry pf2e keeps archetypes as journal pages, not items;
 * its feats are `feat` entries with the `archetype` trait and the archetype's own trait.
 */
export const ArchetypeData = z.strictObject({
  /** The `feat` that opens it, which every other feat of the archetype requires. */
  dedication: ContentId,
  /** The `class` it is the multiclass archetype of (Fighter Dedication); absent for any other archetype. */
  multiclass: ContentId.optional(),
});
export type ArchetypeData = z.infer<typeof ArchetypeData>;
