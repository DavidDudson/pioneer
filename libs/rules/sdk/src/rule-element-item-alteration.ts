import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { Predicate } from './predicate';
import { RuleElementKey, ruleElementBase, RuleValue } from './rule-element-base';
import { Trait } from './trait';

/** How an item alteration changes a number. */
export const NumericAlterationMode = {
  Add: 'add',
  Subtract: 'subtract',
  Multiply: 'multiply',
  Upgrade: 'upgrade',
  Downgrade: 'downgrade',
  Override: 'override',
} as const;
export type NumericAlterationMode = ValueOf<typeof NumericAlterationMode>;

/** Item numbers an alteration can change. More land with the Epic 2.6 translators. */
export const NumericItemProperty = {
  AcBonus: 'ac-bonus',
  CheckPenalty: 'check-penalty',
  DexCap: 'dex-cap',
  Hardness: 'hardness',
  HitPointsMax: 'hp-max',
  SpeedPenalty: 'speed-penalty',
  Strength: 'strength',
} as const;
export type NumericItemProperty = ValueOf<typeof NumericItemProperty>;

export const TraitAlterationMode = { Add: 'add', Remove: 'remove' } as const;
export type TraitAlterationMode = ValueOf<typeof TraitAlterationMode>;

/** Item properties that are not numbers. */
export const ItemProperty = { Traits: 'traits', DamageType: 'damage-type' } as const;
export type ItemProperty = ValueOf<typeof ItemProperty>;

const OverrideMode = z.literal(NumericAlterationMode.Override);

/** Fields of every alteration: which items it reaches (their roll options, `item:trait:shield`). */
const alterationBase = {
  key: z.literal(RuleElementKey.ItemAlteration),
  items: Predicate,
};

/**
 * Changes a property of the character's items that satisfy `items`: a shield's hardness, a
 * weapon's traits or damage type. The `property` decides which modes and values fit.
 */
export const ItemAlterationElement = z.discriminatedUnion('property', [
  z.strictObject({
    ...alterationBase,
    property: z.enum(NumericItemProperty),
    mode: z.enum(NumericAlterationMode),
    value: RuleValue,
    ...ruleElementBase,
  }),
  z.strictObject({
    ...alterationBase,
    property: z.literal(ItemProperty.Traits),
    mode: z.enum(TraitAlterationMode),
    value: Trait,
    ...ruleElementBase,
  }),
  z.strictObject({
    ...alterationBase,
    property: z.literal(ItemProperty.DamageType),
    mode: OverrideMode,
    value: DamageTypeSchema,
    ...ruleElementBase,
  }),
]);
export type ItemAlterationElement = z.infer<typeof ItemAlterationElement>;
