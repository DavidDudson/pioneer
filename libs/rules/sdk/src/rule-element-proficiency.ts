import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { Predicate } from './predicate';
import { ProficiencySchema } from './proficiency';
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
  value: RaisedRank.optional(),
  visible: z.boolean().optional(),
  ...ruleElementBase,
});
export type MartialProficiencyElement = z.infer<typeof MartialProficiencyElement>;
