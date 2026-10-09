import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { ContentText } from './content-text';
import { Predicate } from './predicate';
import { ProficiencySchema } from './proficiency';
import { RuleElementKey, ruleElementBase, RuleSlug } from './rule-element-base';
import { Selector } from './selector';

/** A rank an element raises to. Untrained is every statistic's floor, so raising to it does nothing. */
export const RaisedRank = ProficiencySchema.exclude(['Untrained']);
export type RaisedRank = z.infer<typeof RaisedRank>;

/**
 * Raises one statistic's proficiency rank to at least `rank` in the base phase; the highest raise
 * wins. The typed stand-in for Foundry's rank upgrades through `ActiveEffectLike` (ADR-0008).
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
export const WeaponCategorySchema = z.enum(WeaponCategory);

export const ArmorCategory = {
  Unarmored: 'unarmored',
  Light: 'light',
  Medium: 'medium',
  Heavy: 'heavy',
} as const;
export type ArmorCategory = ValueOf<typeof ArmorCategory>;
export const ArmorCategorySchema = z.enum(ArmorCategory);

const martialGroupFields = {
  /** Names the group's proficiency, as a category's name does. */
  slug: RuleSlug,
  label: ContentText,
  /** The weapons or armour in the group, by their roll options. */
  definition: Predicate,
};

/**
 * Weapons that are not a category, defined by predicate ("advanced firearms"). With `sameAs`, the
 * group also has that category's rank when it is higher.
 */
export const WeaponGroup = z.strictObject({ ...martialGroupFields, sameAs: WeaponCategorySchema.optional() });
export type WeaponGroup = z.infer<typeof WeaponGroup>;

/** Armour that is not a category, defined like a `WeaponGroup`. */
export const ArmorGroup = z.strictObject({ ...martialGroupFields, sameAs: ArmorCategorySchema.optional() });
export type ArmorGroup = z.infer<typeof ArmorGroup>;

/** Raises the rank in a weapon or armour category, or in a group defined by predicate, to at least `rank`. */
export const MartialProficiencyElement = z.discriminatedUnion('kind', [
  z.strictObject({
    key: z.literal(RuleElementKey.MartialProficiency),
    kind: z.literal(MartialKind.Attack),
    category: z.union([WeaponCategorySchema, WeaponGroup]),
    rank: RaisedRank,
    ...ruleElementBase,
  }),
  z.strictObject({
    key: z.literal(RuleElementKey.MartialProficiency),
    kind: z.literal(MartialKind.Defense),
    category: z.union([ArmorCategorySchema, ArmorGroup]),
    rank: RaisedRank,
    ...ruleElementBase,
  }),
]);
export type MartialProficiencyElement = z.infer<typeof MartialProficiencyElement>;
