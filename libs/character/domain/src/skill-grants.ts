import type { GrantResolution } from '@pioneer/rules/grants';
import { Level } from '@pioneer/rules/sdk';
import type { ContentId, Proficiency, Selector } from '@pioneer/rules/sdk';

import { CHARACTER_LEVEL_MAX, CHARACTER_LEVEL_MIN } from './character-fields';
import { bisected } from './level-bisect';
import { grantedSkillRanks, trainingEntries } from './skill-raises';

const FIRST_LEVEL = Level.parse(CHARACTER_LEVEL_MIN);
const LAST_LEVEL = Level.parse(CHARACTER_LEVEL_MAX);

/** The character's grants at a level, over every pick it holds. */
export type GrantsAt = (level: Level) => GrantResolution;

/** What the grants at a level give a skill slot: the ranks they raise skills to, and the entries that train each. */
export interface SkillGrants {
  readonly ranks: ReadonlyMap<Selector, Proficiency>;
  readonly entries: ReadonlyMap<Selector, readonly ContentId[]>;
}

function sameMap<TValue>(
  left: ReadonlyMap<Selector, TValue>,
  right: ReadonlyMap<Selector, TValue>,
  equal: (leftValue: TValue, rightValue: TValue | undefined) => boolean,
): boolean {
  return left.size === right.size && [...left].every(([key, value]) => equal(value, right.get(key)));
}

function sameEntries(left: readonly ContentId[], right: readonly ContentId[] | undefined): boolean {
  return right !== undefined && left.length === right.length && left.every((id, index) => id === right[index]);
}

function sameSkillGrants(left: SkillGrants, right: SkillGrants): boolean {
  return (
    sameMap(left.ranks, right.ranks, (leftRank, rightRank) => leftRank === rightRank) &&
    sameMap(left.entries, right.entries, sameEntries)
  );
}

/** What the grants at `level` give a skill slot, read from the resolution at that level itself. */
export function exactSkillGrants(grantsAt: GrantsAt, level: Level): SkillGrants {
  const resolution = grantsAt(level);
  return { ranks: grantedSkillRanks(resolution), entries: trainingEntries(resolution) };
}

/**
 * What the grants at each level give a skill slot. Ranks and the entries that train only grow with the level, so where
 * the first and last levels (or the ends of any range) agree, the levels between share their value, and are not
 * resolved: a rogue's nineteen skill increases read a handful of levels, not nineteen.
 */
export function skillGrantsAt(grantsAt: GrantsAt): (level: Level) => SkillGrants {
  return bisected((level) => exactSkillGrants(grantsAt, level), sameSkillGrants, {
    first: FIRST_LEVEL,
    last: LAST_LEVEL,
  });
}
