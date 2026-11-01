import { ConditionSlug } from './condition-seriousness';

/** Message keys the condition badge renders with, spelled out so the key check sees them. */
export const ConditionBadgeMessage = {
  /** A condition with no name here (homebrew): "Condition". */
  Other: 'rules.conditionBadge.other',
  /** The line for a character at or below half its Hit Points. */
  Bloodied: 'rules.conditionBadge.bloodied',
  /** What the conditions popover says when there is nothing to list. */
  None: 'rules.conditionBadge.none',
} as const;

/** The name of each remaster condition, for the badge's text alternative. */
export const CONDITION_NAMES: Readonly<Record<ConditionSlug, string>> = {
  [ConditionSlug.Dying]: 'rules.conditionBadge.name.dying',
  [ConditionSlug.Doomed]: 'rules.conditionBadge.name.doomed',
  [ConditionSlug.Wounded]: 'rules.conditionBadge.name.wounded',
  [ConditionSlug.Unconscious]: 'rules.conditionBadge.name.unconscious',
  [ConditionSlug.Paralyzed]: 'rules.conditionBadge.name.paralyzed',
  [ConditionSlug.Petrified]: 'rules.conditionBadge.name.petrified',
  [ConditionSlug.PersistentDamage]: 'rules.conditionBadge.name.persistentDamage',
  [ConditionSlug.Stunned]: 'rules.conditionBadge.name.stunned',
  [ConditionSlug.Controlled]: 'rules.conditionBadge.name.controlled',
  [ConditionSlug.Confused]: 'rules.conditionBadge.name.confused',
  [ConditionSlug.Restrained]: 'rules.conditionBadge.name.restrained',
  [ConditionSlug.Grabbed]: 'rules.conditionBadge.name.grabbed',
  [ConditionSlug.Immobilized]: 'rules.conditionBadge.name.immobilized',
  [ConditionSlug.Fleeing]: 'rules.conditionBadge.name.fleeing',
  [ConditionSlug.Frightened]: 'rules.conditionBadge.name.frightened',
  [ConditionSlug.Blinded]: 'rules.conditionBadge.name.blinded',
  [ConditionSlug.Deafened]: 'rules.conditionBadge.name.deafened',
  [ConditionSlug.Slowed]: 'rules.conditionBadge.name.slowed',
  [ConditionSlug.Sickened]: 'rules.conditionBadge.name.sickened',
  [ConditionSlug.Stupefied]: 'rules.conditionBadge.name.stupefied',
  [ConditionSlug.Enfeebled]: 'rules.conditionBadge.name.enfeebled',
  [ConditionSlug.Clumsy]: 'rules.conditionBadge.name.clumsy',
  [ConditionSlug.Drained]: 'rules.conditionBadge.name.drained',
  [ConditionSlug.Fascinated]: 'rules.conditionBadge.name.fascinated',
  [ConditionSlug.Fatigued]: 'rules.conditionBadge.name.fatigued',
  [ConditionSlug.Dazzled]: 'rules.conditionBadge.name.dazzled',
  [ConditionSlug.Quickened]: 'rules.conditionBadge.name.quickened',
  [ConditionSlug.Broken]: 'rules.conditionBadge.name.broken',
  [ConditionSlug.Encumbered]: 'rules.conditionBadge.name.encumbered',
  [ConditionSlug.OffGuard]: 'rules.conditionBadge.name.offGuard',
  [ConditionSlug.Prone]: 'rules.conditionBadge.name.prone',
  [ConditionSlug.Concealed]: 'rules.conditionBadge.name.concealed',
  [ConditionSlug.Hidden]: 'rules.conditionBadge.name.hidden',
  [ConditionSlug.Undetected]: 'rules.conditionBadge.name.undetected',
  [ConditionSlug.Unnoticed]: 'rules.conditionBadge.name.unnoticed',
  [ConditionSlug.Invisible]: 'rules.conditionBadge.name.invisible',
  [ConditionSlug.Observed]: 'rules.conditionBadge.name.observed',
};
