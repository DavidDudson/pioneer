import { FormulaText } from '@pioneer/rules/formula';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { formulaIssues, FormulaSource } from './formula-source';
import { Predicate } from './predicate';
import { ProficiencyBonusTable, ProficiencySchema } from './proficiency';
import { RuleElementKey, ruleElementBase, RuleSlug } from './rule-element-base';
import { Selector } from './selector';

/** A rank an element raises to. Untrained is every statistic's floor, so raising to it does nothing. */
export const RaisedRank = ProficiencySchema.exclude(['Untrained']);
export type RaisedRank = z.infer<typeof RaisedRank>;

/**
 * Raises one statistic's proficiency rank to at least `rank` in the base phase; the highest raise
 * wins. The typed stand-in for Foundry's rank upgrades through `ActiveEffectLike` (ADR-0008),
 * weapon and armour categories included (`attack:martial`, `defense:heavy`).
 */
export const ProficiencyElement = z.strictObject({
  key: z.literal(RuleElementKey.Proficiency),
  selector: Selector,
  rank: RaisedRank,
  ...ruleElementBase,
});
export type ProficiencyElement = z.infer<typeof ProficiencyElement>;

/**
 * A raised rank by name, or a formula giving one from 1 (trained) to 4 (legendary), as Foundry allows. A string
 * that names no rank is checked as a formula first, so the issue says what is wrong with the formula instead of a
 * plain union's "no match".
 */
const RankOrFormula: z.ZodType<RaisedRank | FormulaSource> = z
  .unknown()
  .check((context) => {
    const { value } = context;
    const named = RaisedRank.safeParse(value);
    if (typeof value === 'string' && !named.success) {
      context.issues.push(...formulaIssues(FormulaText.parse(value)));
    }
  })
  .pipe(z.union([RaisedRank, FormulaSource]));

/** Whether a martial proficiency covers weapons and unarmed attacks, or armour (Foundry's `kind`). */
export const MartialKind = {
  Attack: 'attack',
  Defense: 'defense',
} as const;
export type MartialKind = ValueOf<typeof MartialKind>;

export const WeaponCategory = {
  Unarmed: 'unarmed',
  Simple: 'simple',
  Martial: 'martial',
  Advanced: 'advanced',
} as const;
export type WeaponCategory = ValueOf<typeof WeaponCategory>;

export const ArmorCategory = {
  Unarmored: 'unarmored',
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;
export type ArmorCategory = ValueOf<typeof ArmorCategory>;

/** A weapon or armour category a martial proficiency can link to, as Foundry's `sameAs` allows. */
export const MartialCategory = z.enum({ ...WeaponCategory, ...ArmorCategory });
export type MartialCategory = z.infer<typeof MartialCategory>;

/**
 * A new proficiency for the weapons or armour whose roll options satisfy `definition` ("advanced
 * firearms and crossbows"), with Foundry's fields and defaults: `kind` defaults to attack and
 * `value` to trained. With `sameAs`, its rank is that category's instead, capped at `maxRank`.
 * `display.label` names it on the sheet; `visible: false` leaves it off the sheet.
 */
export const MartialProficiencyElement = z.strictObject({
  key: z.literal(RuleElementKey.MartialProficiency),
  kind: z.enum(MartialKind).optional(),
  /** Foundry derives it from the label when absent; the importer does the same. */
  slug: RuleSlug,
  definition: Predicate,
  sameAs: MartialCategory.optional(),
  maxRank: RaisedRank.optional(),
  value: RankOrFormula.optional(),
  visible: z.boolean().optional(),
  ...ruleElementBase,
});
export type MartialProficiencyElement = z.infer<typeof MartialProficiencyElement>;

/**
 * Replaces how every proficiency rank becomes a bonus: the table `@prof.<selector>` reads, which the core rules
 * pack defines. A Pioneer element with no Foundry counterpart (Foundry makes Proficiency Without Level a world
 * setting); a variant rule carries it (ADR-0024). Of several in play, the last by priority and then id wins.
 */
export const ProficiencyBonusElement = z.strictObject({
  key: z.literal(RuleElementKey.ProficiencyBonus),
  table: ProficiencyBonusTable,
  ...ruleElementBase,
});
export type ProficiencyBonusElement = z.infer<typeof ProficiencyBonusElement>;
