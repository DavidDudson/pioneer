import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ProficiencySchema } from './proficiency';
import { SkillSelector } from './selector';
import { castingFields } from './spell-casting';
import { uniqueItems } from './unique-items';

const CHECK_SKILLS_MAX = 4;
const SECONDARY_CHECKS_MAX = 4;

/** How many secondary casters a ritual needs; none for some. */
const CasterCount = Pg.smallint().nonnegative().brand<'CasterCount'>();

/** A ritual check: one of its skills ("Arcana or Occultism"), at a proficiency rank when it names one ("expert"). */
const RitualCheck = z.strictObject({
  skills: z.array(SkillSelector).min(1).max(CHECK_SKILLS_MAX).readonly().check(uniqueItems),
  proficiency: ProficiencySchema.optional(),
});

/** The secondary casters' checks, each its own, and how many casters there are. */
const SecondaryCasting = z.strictObject({
  checks: z.array(RitualCheck).max(SECONDARY_CHECKS_MAX).readonly(),
  casters: CasterCount,
});

/**
 * A ritual's `data` on the `ContentEntry` envelope: what casting it takes, as for a spell, and its checks. Foundry
 * pf2e stores it as a spell with ritual data; it has no traditions, damage or heightening.
 */
export const RitualData = z.strictObject({
  ...castingFields,
  primary: RitualCheck,
  secondary: SecondaryCasting,
});
export type RitualData = z.infer<typeof RitualData>;
