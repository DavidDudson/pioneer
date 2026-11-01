import type { ValueOf } from '@pioneer/shared/kernel';

/** The remaster conditions, by the slug their content entries carry. */
export const ConditionSlug = {
  Dying: 'dying',
  Doomed: 'doomed',
  Wounded: 'wounded',
  Unconscious: 'unconscious',
  Paralyzed: 'paralyzed',
  Petrified: 'petrified',
  PersistentDamage: 'persistent-damage',
  Stunned: 'stunned',
  Controlled: 'controlled',
  Confused: 'confused',
  Restrained: 'restrained',
  Grabbed: 'grabbed',
  Immobilized: 'immobilized',
  Fleeing: 'fleeing',
  Frightened: 'frightened',
  Blinded: 'blinded',
  Deafened: 'deafened',
  Slowed: 'slowed',
  Sickened: 'sickened',
  Stupefied: 'stupefied',
  Enfeebled: 'enfeebled',
  Clumsy: 'clumsy',
  Drained: 'drained',
  Fascinated: 'fascinated',
  Fatigued: 'fatigued',
  Dazzled: 'dazzled',
  Quickened: 'quickened',
  Broken: 'broken',
  Encumbered: 'encumbered',
  OffGuard: 'off-guard',
  Prone: 'prone',
  Concealed: 'concealed',
  Hidden: 'hidden',
  Undetected: 'undetected',
  Unnoticed: 'unnoticed',
  Invisible: 'invisible',
  Observed: 'observed',
} as const;
export type ConditionSlug = ValueOf<typeof ConditionSlug>;

/**
 * Every remaster condition, most serious first: death and what leads to it, then conditions that take a character out
 * of the fight, then those that hinder, then the minor and the positional ones. This order is the ranking, so it is
 * written out here and not read off the key order of `ConditionSlug`.
 */
export const CONDITIONS_BY_SERIOUSNESS: readonly ConditionSlug[] = [
  ConditionSlug.Dying,
  ConditionSlug.Doomed,
  ConditionSlug.Wounded,
  ConditionSlug.Unconscious,
  ConditionSlug.Paralyzed,
  ConditionSlug.Petrified,
  ConditionSlug.PersistentDamage,
  ConditionSlug.Stunned,
  ConditionSlug.Controlled,
  ConditionSlug.Confused,
  ConditionSlug.Restrained,
  ConditionSlug.Grabbed,
  ConditionSlug.Immobilized,
  ConditionSlug.Fleeing,
  ConditionSlug.Frightened,
  ConditionSlug.Blinded,
  ConditionSlug.Deafened,
  ConditionSlug.Slowed,
  ConditionSlug.Sickened,
  ConditionSlug.Stupefied,
  ConditionSlug.Enfeebled,
  ConditionSlug.Clumsy,
  ConditionSlug.Drained,
  ConditionSlug.Fascinated,
  ConditionSlug.Fatigued,
  ConditionSlug.Dazzled,
  ConditionSlug.Quickened,
  ConditionSlug.Broken,
  ConditionSlug.Encumbered,
  ConditionSlug.OffGuard,
  ConditionSlug.Prone,
  ConditionSlug.Concealed,
  ConditionSlug.Hidden,
  ConditionSlug.Undetected,
  ConditionSlug.Unnoticed,
  ConditionSlug.Invisible,
  ConditionSlug.Observed,
];

const RANK: ReadonlyMap<string, number> = new Map(CONDITIONS_BY_SERIOUSNESS.map((slug, index) => [slug, index]));

/** A slug the list does not know (homebrew) ranks after every known one. */
const UNKNOWN_RANK = CONDITIONS_BY_SERIOUSNESS.length;

function rankOf(slug: string): number {
  return RANK.get(slug) ?? UNKNOWN_RANK;
}

/**
 * The conditions ordered most serious first, so the worst is first. A total order: unknown slugs come after the known
 * ones, and equal ones (the same slug twice, or two unknown slugs) keep their input order. The input is not changed.
 */
export function bySeriousness(slugs: readonly string[]): readonly string[] {
  return slugs.toSorted((first, second) => rankOf(first) - rankOf(second));
}

/** Whether a slug is one of the remaster conditions, so it has an icon and a name here. */
export function isConditionSlug(slug: string): slug is ConditionSlug {
  return RANK.has(slug);
}
