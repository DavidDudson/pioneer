import { issueParams, message, Pg } from '@pioneer/shared/kernel';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentText } from './content-text';
import { RulesMessage } from './messages';
import { ProficiencySchema } from './proficiency';
import { SkillSelector } from './selector';
import { castingFields } from './spell-casting';
import { uniqueItems } from './unique-items';
import { Dc } from './units';

const CHECK_SKILLS_MAX = 4;
const SECONDARY_CHECKS_MAX = 8;

/** How many secondary casters a ritual needs. */
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
 * each skill its own rank where they differ, in place of `proficiency`. `mythic` is a check every skill of which needs
 * mythic proficiency, which is no rank of the proficiency table. `dc` is the check's own DC; `pick` is how its skill is
 * chosen; `note` is what the check also asks that these fields cannot state ("you must be a demon").
 */
const CheckFields = z.strictObject({
  skills: z.array(SkillSelector).min(1).max(CHECK_SKILLS_MAX).readonly().check(uniqueItems),
  proficiency: ProficiencySchema.optional(),
  mythic: z.literal(true).optional(),
  ranked: z.array(RankedSkill).min(1).max(CHECK_SKILLS_MAX).readonly().optional(),
  loreRelatedTo: LoreRelatedTo.optional(),
  dc: Dc.optional(),
  pick: z.enum(RitualCheckPick).optional(),
  note: ContentText.optional(),
});

const RANKED = { ...issueParams(message(RulesMessage.RitualRanked)), path: ['ranked'] };
const MYTHIC = { ...issueParams(message(RulesMessage.RitualMythic)), path: ['mythic'] };

/** Whether `ranked`, when there, ranks each of the check's skills once, in place of `proficiency`. */
function isRankedWhole({ skills, ranked, proficiency }: z.infer<typeof CheckFields>): boolean {
  if (ranked === undefined) {
    return true;
  }
  const named = new Set(ranked.map(({ skill }) => skill));
  return proficiency === undefined && named.size === skills.length && skills.every((skill) => named.has(skill));
}

/** Whether a mythic check, when it is one, names no other rank. */
function isMythicAlone({ mythic, proficiency, ranked }: z.infer<typeof CheckFields>): boolean {
  return mythic === undefined || (proficiency === undefined && ranked === undefined);
}

const StructuredCheck = CheckFields.refine(isRankedWhole, RANKED).refine(isMythicAlone, MYTHIC);

/**
 * A check Foundry words in a way the fields cannot state ("skill corresponding to the target's casting tradition
 * (trained)"), kept as the text it gives.
 */
const TextCheck = z.strictObject({ text: ContentText });

const RitualCheck = z.union([StructuredCheck, TextCheck]);

/** The secondary casters' checks, each its own, and how many casters there are. */
const SecondaryCasting = z.strictObject({
  checks: z.array(RitualCheck).max(SECONDARY_CHECKS_MAX).readonly(),
  /** Absent where Foundry gives none (a ritual whose casters vary). */
  casters: CasterCount.optional(),
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
