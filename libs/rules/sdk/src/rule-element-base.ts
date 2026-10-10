import type { ValueOf } from '@pioneer/shared/kernel';
import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { ContentText } from './content-text';
import { FormulaSource } from './formula-source';
import { Predicate } from './predicate';
import { Domain, Selector } from './selector';

/** The `key` of every rule element, as Foundry pf2e names them (ADR-0008). */
export const RuleElementKey = {
  GrantItem: 'GrantItem',
  ChoiceSet: 'ChoiceSet',
  RollOption: 'RollOption',
  ItemAlteration: 'ItemAlteration',
  FlatModifier: 'FlatModifier',
  AdjustModifier: 'AdjustModifier',
  Change: 'Change',
  DexterityCap: 'DexterityCap',
  MultipleAttackPenalty: 'MultipleAttackPenalty',
  Proficiency: 'Proficiency',
  MartialProficiency: 'MartialProficiency',
  ProficiencyBonus: 'ProficiencyBonus',
} as const;
export type RuleElementKey = ValueOf<typeof RuleElementKey>;

/**
 * When an element runs relative to others of its phase; lower runs first. Optional: each element
 * has Foundry's default for its kind, which the engine applies.
 */
export const RulePriority = Pg.smallint().brand<'RulePriority'>();
export type RulePriority = z.infer<typeof RulePriority>;

/**
 * How the sheet shows what the element produces. `label` replaces the entry's name on breakdown
 * lines; `hidden` keeps the line out of breakdowns (it still applies). `summary` replaces the generated
 * wording of when a conditional line applies ("while Hunting Prey"), for predicates it words badly.
 */
export const RuleDisplay = z.strictObject({
  label: ContentText.optional(),
  summary: ContentText.optional(),
  hidden: z.boolean().optional(),
});
export type RuleDisplay = z.infer<typeof RuleDisplay>;

/** Fields every rule element has besides its `key`. */
export const ruleElementBase = {
  /** The element only applies while this holds. */
  predicate: Predicate.optional(),
  priority: RulePriority.optional(),
  display: RuleDisplay.optional(),
};

/**
 * A name another element refers back to: the flag a `ChoiceSet` stores its selection under, or
 * the slug a `FlatModifier` gives the modifier so an `AdjustModifier` can find it.
 */
export const RuleSlug = Slug.brand<'RuleSlug'>();
export type RuleSlug = z.infer<typeof RuleSlug>;

/** A plain number in a rule element: added, multiplied by (`0.5`) or set. */
export const RuleNumber = z.number().brand<'RuleNumber'>();
export type RuleNumber = z.infer<typeof RuleNumber>;

/** A number, or a formula that evaluates to one. */
export const RuleValue = z.union([RuleNumber, FormulaSource]);
export type RuleValue = z.infer<typeof RuleValue>;

/**
 * What a modifier aims at: one statistic (`save:fortitude`) or a domain of them (`skill-check`).
 * Both share one grammar, so the engine tells them apart when it resolves the target.
 */
export const ModifierTarget = z.union([Selector, Domain]);
export type ModifierTarget = z.infer<typeof ModifierTarget>;

const TARGETS_MAX = 32;

/** The statistics and domains an element reaches; at least one. */
export const ModifierTargets = z.array(ModifierTarget).min(1).max(TARGETS_MAX);
