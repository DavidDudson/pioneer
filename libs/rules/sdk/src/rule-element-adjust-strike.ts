import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Slug } from './content-id';
import { Predicate } from './predicate';
import { RuleElementKey, ruleElementBase, RuleValue } from './rule-element-base';
import { NumericAlterationMode, TraitAlterationMode } from './rule-element-item-alteration';
import { Trait } from './trait';

/** What an adjustment of Strikes changes besides their traits. */
export const StrikeProperty = {
  Traits: 'traits',
  Materials: 'materials',
  PropertyRunes: 'property-runes',
  RangeIncrement: 'range-increment',
} as const;
export type StrikeProperty = ValueOf<typeof StrikeProperty>;

const AddMode = z.literal(NumericAlterationMode.Add);

/** Fields of every adjustment: which Strikes it reaches (their roll options, `item:ranged`); all of them when absent. */
const adjustmentBase = {
  key: z.literal(RuleElementKey.AdjustStrike),
  strikes: Predicate.optional(),
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
