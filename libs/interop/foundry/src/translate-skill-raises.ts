import { Proficiency, RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

import { SKILLS } from './foundry-skills';

/** Foundry's ranks by number, trained (1) to legendary (4). */
const RANKS = [Proficiency.Trained, Proficiency.Expert, Proficiency.Master, Proficiency.Legendary] as const;
const LOWEST_RANK = 1;

/** `system.skills.<skill>.rank`: the skill's slug is the segment between. */
const SKILL_RANK_PATH = /^system\.skills\.(?<skill>[a-z]+)\.rank$/u;

/** Foundry's raise of a fixed skill's rank: an `ActiveEffectLike` upgrading it to a fixed rank. */
const FoundrySkillRaise = z.strictObject({
  key: z.literal('ActiveEffectLike'),
  mode: z.literal('upgrade'),
  path: z.string().regex(SKILL_RANK_PATH),
  value: z.number().int().min(LOWEST_RANK).max(RANKS.length),
  predicate: z.unknown().optional(),
});

/**
 * Foundry's `ActiveEffectLike` upgrading `system.skills.<skill>.rank` to a fixed rank (Dwarven Weapon Cunning's
 * trained Athletics, a dedication's skill) as a `Proficiency` element on `skill:<skill>`. A skill outside the sixteen
 * (a Lore), a formula value, a rank chosen through a `ChoiceSet` or any other field leaves it for the backlog.
 */
export function withSkillRaise(raw: unknown): unknown {
  const raise = FoundrySkillRaise.safeParse(raw);
  if (!raise.success) {
    return raw;
  }
  const { path, value, predicate } = raise.data;
  const skill = SKILL_RANK_PATH.exec(path)?.groups?.['skill'];
  if (skill === undefined || !SKILLS.has(skill)) {
    return raw;
  }
  return {
    key: RuleElementKey.Proficiency,
    selector: `skill:${skill}`,
    rank: RANKS[value - LOWEST_RANK],
    ...(predicate === undefined ? {} : { predicate }),
  };
}
