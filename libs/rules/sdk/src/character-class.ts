import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { AttributeBoost } from './attribute';
import { HitPoints } from './units';

/** How many skills a class trains beyond its fixed ones; the Intelligence modifier adds to it. */
const SkillCount = Pg.smallint().nonnegative().brand<'SkillCount'>();

/**
 * A class's `data` on the `ContentEntry` envelope. Its progression is in `rules`, keyed by level with predicates
 * (`{ "gte": ["self:level", 5] }`): `Proficiency` elements for its starting and later ranks, a `GrantItem` per
 * class feature, and a `ChoiceSet` querying feats for each feat slot and skill increase. Nothing here names a level.
 */
export const ClassData = z.strictObject({
  /** The attributes its key attribute may be (Foundry pf2e's `keyAbility`). */
  keyAttribute: AttributeBoost,
  /** Hit points gained each level, before Constitution. */
  hitPoints: HitPoints,
  /** Skills trained by the player's choice, beyond the fixed ones in `rules`. */
  additionalSkills: SkillCount,
});
export type ClassData = z.infer<typeof ClassData>;
