import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { RulesMessage } from './messages';
import { Predicate } from './predicate';
import { ruleElementBase, RuleElementKey, RuleValue } from './rule-element-base';
import { NumericAlterationMode, TraitAlterationMode } from './rule-element-item-alteration';
import { WeaponCategory } from './rule-element-proficiency';
import { Trait } from './trait';
import { uniqueItems } from './unique-items';
import { Feet } from './units';
import { WeaponDamage, WeaponGroup } from './weapon';

/** The most traits one Strike gives its attack: a jaws attack has a handful. */
const TRAITS_MAX = 16;

const Traits = z.array(Trait).max(TRAITS_MAX).readonly().check(uniqueItems);

/** Whether a Strike element gives exactly one shape: the fist, or an attack of its own with a slug, category and damage. */
function hasOneShape({ fist, slug, category, damage }: StrikeFields): boolean {
  const own = slug !== undefined && category !== undefined && damage !== undefined;
  return fist === true ? slug === undefined && category === undefined && damage === undefined : own;
}

const strikeFields = {
  key: z.literal(RuleElementKey.Strike),
  /** The character's fist: an agile, finesse, nonlethal unarmed attack of 1d4 bludgeoning. */
  fist: z.literal(true).optional(),
  /** An attack of its own, as Foundry pf2e's `Strike` defines one (claws, jaws): its name among the character's Strikes. */
  slug: Slug.optional(),
  category: z.enum(WeaponCategory).optional(),
  group: z.enum(WeaponGroup).optional(),
  traits: Traits.optional(),
  damage: WeaponDamage.optional(),
  /** The range increment of a ranged attack; a melee one has none. */
  range: Feet.optional(),
  ...ruleElementBase,
};

type StrikeFields = z.infer<z.ZodObject<typeof strikeFields>>;

/**
 * Gives the character a Strike, as Foundry pf2e's `Strike` does (ADR-0048): `fist` for the fist a cleric whose deity
 * favours it has (agile, finesse, nonlethal, 1d4 bludgeoning, and whose base the favoured weapon rank reaches), or an
 * unarmed or weapon attack of its own, given a `slug`, `category` and `damage`. The engine derives its attack roll and
 * damage as it does a held weapon's. `display.label` names it on the sheet.
 */
export const StrikeElement = z
  .strictObject(strikeFields)
  .refine(hasOneShape, issueParams(message(RulesMessage.StrikeShape)));
export type StrikeElement = z.infer<typeof StrikeElement>;

/** What an adjustment of Strikes changes besides their traits. */
export const StrikeProperty = {
  Traits: 'traits',
  Materials: 'materials',
  PropertyRunes: 'property-runes',
  RangeIncrement: 'range-increment',
} as const;
export type StrikeProperty = ValueOf<typeof StrikeProperty>;

const AddMode = z.literal(NumericAlterationMode.Add);

/**
 * Fields of every adjustment: which Strikes it reaches (their roll options, `item:ranged`); all of them when absent.
 * `etched` narrows it to the weapon the element's item is etched on, as a property rune's elements need.
 */
const adjustmentBase = {
  key: z.literal(RuleElementKey.AdjustStrike),
  strikes: Predicate.optional(),
  etched: z.literal(true).optional(),
  ...ruleElementBase,
};

/**
 * Changes the Strikes of the character's weapons that satisfy `strikes`, as Foundry pf2e's `AdjustStrike` does
 * (ADR-0008): a trait added or removed (`holy`), a material (`silver`) or a property rune (`ghost-touch`) a weapon
 * counts as having for the Strike, or its range increment. The `property` decides which modes and values fit.
 */
export const AdjustStrikeElement = z.discriminatedUnion('property', [
  z.strictObject({
    ...adjustmentBase,
    property: z.literal(StrikeProperty.Traits),
    mode: z.enum(TraitAlterationMode),
    value: Trait,
  }),
  z.strictObject({
    ...adjustmentBase,
    property: z.literal(StrikeProperty.Materials),
    mode: AddMode,
    value: Slug,
  }),
  z.strictObject({
    ...adjustmentBase,
    property: z.literal(StrikeProperty.PropertyRunes),
    mode: AddMode,
    value: Slug,
  }),
  z.strictObject({
    ...adjustmentBase,
    property: z.literal(StrikeProperty.RangeIncrement),
    mode: z.enum(NumericAlterationMode),
    value: RuleValue,
  }),
]);
export type AdjustStrikeElement = z.infer<typeof AdjustStrikeElement>;
