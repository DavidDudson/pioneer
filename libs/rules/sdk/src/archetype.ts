import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentId } from './content-id';
import { ContentLevel } from './units';

/** How many other feats of an archetype a character needs before another dedication. */
export const DedicationLock = Pg.smallint().positive().brand<'DedicationLock'>();
export type DedicationLock = z.infer<typeof DedicationLock>;

/** Player Core's lock: two other feats of the archetype. */
export const DEDICATION_LOCK_DEFAULT = DedicationLock.parse(2);

/**
 * A feat of another source that an archetype lists under "Additional Feats": "You can take the feat as an archetype
 * feat of that level, meaning it counts toward the number of feats required by the archetype's dedication feat."
 */
export const AdditionalFeat = z.strictObject({
  feat: ContentId,
  /** The level the archetype gives it, which may differ from the feat's own. */
  level: ContentLevel,
});
export type AdditionalFeat = z.infer<typeof AdditionalFeat>;

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
  /** The feats of other sources it lists as its own, for a character holding its dedication. */
  additionalFeats: z.array(AdditionalFeat).min(1).readonly().optional(),
});
export type ArchetypeData = z.infer<typeof ArchetypeData>;
