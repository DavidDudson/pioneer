import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';

/** How many other feats of an archetype a character needs before another dedication. */
export const DedicationLock = Pg.smallint().positive().brand<'DedicationLock'>();
export type DedicationLock = z.infer<typeof DedicationLock>;

/** Player Core's lock: two other feats of the archetype. */
export const DEDICATION_LOCK_DEFAULT = DedicationLock.parse(2);

/**
 * An archetype's `data` on the `ContentEntry` envelope. Foundry pf2e keeps archetypes as journal pages, not items;
 * its feats are `feat` entries with the `archetype` trait and the archetype's own trait.
 */
export const ArchetypeData = z.strictObject({
  /** The `feat` that opens it, which every other feat of the archetype requires. */
  dedication: ContentId,
  /** The `class` it is the multiclass archetype of (Fighter Dedication); absent for any other archetype. */
  multiclass: ContentId.optional(),
  /** Other feats of this archetype needed before the next dedication; absent for Player Core's two. */
  dedicationLock: DedicationLock.optional(),
});
export type ArchetypeData = z.infer<typeof ArchetypeData>;
