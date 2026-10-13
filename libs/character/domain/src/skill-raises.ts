import { resolvedRules } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';
import { evaluatePredicate, Truth } from '@pioneer/rules/predicate';
import { Proficiency, RuleElementKey, Selector, SkillCount } from '@pioneer/rules/sdk';
import type { ContentId } from '@pioneer/rules/sdk';

import { SKILL_PREFIX } from './skill-content';

export const RANKS: readonly Proficiency[] = Object.values(Proficiency);

/** The higher of two ranks, undefined for neither. */
export function higher(left: Proficiency | undefined, right: Proficiency | undefined): Proficiency | undefined {
  return RANKS.indexOf(right ?? Proficiency.Untrained) > RANKS.indexOf(left ?? Proficiency.Untrained) ? right : left;
}

/** A skill rank one entry of the effective set raises, by a `Proficiency` element whose predicate holds. */
interface SkillRaise {
  readonly entry: ContentId;
  readonly selector: Selector;
  readonly rank: Proficiency;
}

/** Perception's selector: a prerequisite reads its rank beside the skills' (`perception:rank:2`). */
const PERCEPTION = Selector.parse('perception');

function isSkill(selector: Selector): boolean {
  return selector.startsWith(SKILL_PREFIX);
}

/** The raises the effective set makes of the selectors `ranked` accepts, a choice-driven selector resolved to its pick. */
function rankRaises(resolution: GrantResolution, ranked: (selector: Selector) => boolean): SkillRaise[] {
  const { facts } = resolution;
  return resolvedRules(resolution).flatMap(({ entry, element }): SkillRaise[] => {
    if (
      element.key !== RuleElementKey.Proficiency ||
      typeof element.selector !== 'string' ||
      !ranked(element.selector)
    ) {
      return [];
    }
    const holds = element.predicate === undefined || evaluatePredicate(element.predicate, facts) === Truth.True;
    return holds ? [{ entry: entry.id, selector: element.selector, rank: element.rank }] : [];
  });
}

function skillRaises(resolution: GrantResolution): SkillRaise[] {
  return rankRaises(resolution, isSkill);
}

/**
 * The skill and Perception ranks the effective set raises: the highest raise of each. Perception's rank is read by
 * prerequisites beside the skills' and set by no slot, so it comes from the raises alone.
 */
export function grantedSkillRanks(resolution: GrantResolution): ReadonlyMap<Selector, Proficiency> {
  const ranks = new Map<Selector, Proficiency>();
  const raises = rankRaises(resolution, (selector) => isSkill(selector) || selector === PERCEPTION);
  for (const { selector, rank } of raises) {
    ranks.set(selector, higher(ranks.get(selector), rank) ?? rank);
  }
  return ranks;
}

/**
 * How many skills the grants train twice at 1st level: an entry training a skill another already trains trains
 * another skill instead, the player's choice (Player Core), so each adds a trained skill slot.
 */
export function duplicateTrainings(resolution: GrantResolution): SkillCount {
  const trainers = Map.groupBy(
    skillRaises(resolution).filter(({ rank }) => rank === Proficiency.Trained),
    ({ selector }) => selector,
  );
  const twice = [...trainers.values()].map((raises) => new Set(raises.map(({ entry }) => entry)).size - 1);
  return SkillCount.parse(twice.reduce((total, count) => total + count, 0));
}

/** The entries of the effective set that train each skill, by selector. */
export function trainingEntries(resolution: GrantResolution): ReadonlyMap<Selector, readonly ContentId[]> {
  const trainers = Map.groupBy(
    skillRaises(resolution).filter(({ rank }) => rank !== Proficiency.Untrained),
    ({ selector }) => selector,
  );
  return new Map(
    [...trainers].map(([selector, raises]) => [selector, [...new Set(raises.map(({ entry }) => entry))]] as const),
  );
}
