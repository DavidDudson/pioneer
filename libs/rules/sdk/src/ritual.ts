import { Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ProficiencySchema } from './proficiency';
import { SkillSelector } from './selector';
import { castingFields } from './spell-casting';
import { uniqueItems } from './unique-items';
import { Dc } from './units';

const CHECK_SKILLS_MAX = 4;
const SECONDARY_CHECKS_MAX = 4;

/** How many secondary casters a ritual needs; none for some. */
const CasterCount = Pg.smallint().nonnegative().brand<'CasterCount'>();

/** How a check's skill is picked from its `skills`, when the caster does not choose freely. */
export const RitualCheckPick = {
  /** The skill the tradition of the spell cast in the ritual names (Arcana, Nature, Occultism or Religion). */
  Tradition: 'tradition',
  /** A secondary check: the skill the primary check used. */
  PrimaryUsed: 'primary-used',
  /** A secondary check: the skill the primary check did not use. */
  PrimaryUnused: 'primary-unused',
} as const;
export type RitualCheckPick = ValueOf<typeof RitualCheckPick>;

/** A skill at a rank of its own, in a check whose skills differ ("Arcana (master) or Religion (expert)"). */
const RankedSkill = z.strictObject({ skill: SkillSelector, proficiency: ProficiencySchema });

const LORE_TOPIC_MAX = 200;

/** What a Lore must relate to: "the destination plane". */
const LoreRelatedTo = z.string().min(1).max(LORE_TOPIC_MAX).brand<'LoreRelatedTo'>();

/**
 * A ritual check: one of its skills ("Arcana or Occultism"), at a proficiency rank when it names one ("expert").
 * `skill:lore` is any Lore, and `loreRelatedTo` the topic it must relate to ("the destination plane"). `ranked` gives
 * each skill its own rank where they differ, in place of `proficiency`. `dc` is the check's own DC; `pick` is how its
 * skill is chosen.
 */
const RitualCheck = z.strictObject({
  skills: z.array(SkillSelector).min(1).max(CHECK_SKILLS_MAX).readonly().check(uniqueItems),
  proficiency: ProficiencySchema.optional(),
  ranked: z.array(RankedSkill).min(1).max(CHECK_SKILLS_MAX).readonly().optional(),
  loreRelatedTo: LoreRelatedTo.optional(),
  dc: Dc.optional(),
  pick: z.enum(RitualCheckPick).optional(),
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
