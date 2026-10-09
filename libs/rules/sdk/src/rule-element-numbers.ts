import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { AttributeSchema } from './attribute';
import { DamageTypeSchema } from './damage';
import { FormulaSource } from './formula-source';
import { RulesMessage } from './messages';
import { ModifierType } from './modifier-type';
import { ModifierTargets, RuleElementKey, ruleElementBase, RuleSlug, RuleValue } from './rule-element-base';
import { Selector } from './selector';
import { Modifier } from './units';

/** A modifier's amount: a whole number, or a formula that evaluates to one. */
export const ModifierValue = z.union([Modifier, FormulaSource]);
export type ModifierValue = z.infer<typeof ModifierValue>;

const flatModifierFields = {
  value: ModifierValue,
  /** Lets an `AdjustModifier` find this modifier. */
  slug: RuleSlug.optional(),
  /** On a damage selector, the damage type the bonus deals. */
  damageType: DamageTypeSchema.optional(),
  ...ruleElementBase,
};
const flatModifierKey = { key: z.literal(RuleElementKey.FlatModifier), selectors: ModifierTargets };

const { Attribute: attributeType, ...otherTypes } = ModifierType;

/**
 * A typed bonus or penalty on the targeted statistics. An attribute modifier names its attribute,
 * so the engine can swap it when the key attribute changes.
 */
export const FlatModifierElement = z.discriminatedUnion('type', [
  z.strictObject({
    ...flatModifierKey,
    type: z.literal(attributeType),
    attribute: AttributeSchema,
    ...flatModifierFields,
  }),
  z.strictObject({ ...flatModifierKey, type: z.enum(otherTypes), ...flatModifierFields }),
]);
export type FlatModifierElement = z.infer<typeof FlatModifierElement>;

/** How an `AdjustModifier` changes the modifiers it finds. */
export const AdjustMode = {
  Add: 'add',
  Subtract: 'subtract',
  Multiply: 'multiply',
  Upgrade: 'upgrade',
  Downgrade: 'downgrade',
  Override: 'override',
} as const;
export type AdjustMode = ValueOf<typeof AdjustMode>;

/**
 * Changes other modifiers on the targeted statistics: those with `slug`, or all that pass the
 * element's predicate. Either sets `mode` and `value`, or `suppress`es them (Foundry's shape).
 */
export const AdjustModifierElement = z
  .strictObject({
    key: z.literal(RuleElementKey.AdjustModifier),
    selectors: ModifierTargets,
    slug: RuleSlug.optional(),
    mode: z.enum(AdjustMode).optional(),
    value: RuleValue.optional(),
    suppress: z.literal(true).optional(),
    ...ruleElementBase,
  })
  .refine(
    (element) =>
      element.suppress === true
        ? element.mode === undefined && element.value === undefined
        : element.mode !== undefined && element.value !== undefined,
    issueParams(message(RulesMessage.AdjustModeOrSuppress)),
  );
export type AdjustModifierElement = z.infer<typeof AdjustModifierElement>;

/** How a `Change` alters a statistic's value, applied in Foundry's order: add, multiply, upgrade, downgrade, override. */
export const ChangeMode = {
  Add: 'add',
  Multiply: 'multiply',
  Upgrade: 'upgrade',
  Downgrade: 'downgrade',
  Override: 'override',
} as const;
export type ChangeMode = ValueOf<typeof ChangeMode>;

/**
 * Sets or adjusts one statistic's value in the base phase, before modifiers. The typed stand-in for
 * Foundry's path-based `ActiveEffectLike` (ADR-0008).
 */
export const ChangeElement = z.strictObject({
  key: z.literal(RuleElementKey.Change),
  selector: Selector,
  mode: z.enum(ChangeMode),
  value: RuleValue,
  ...ruleElementBase,
});
export type ChangeElement = z.infer<typeof ChangeElement>;

/** Caps the Dexterity modifier added to AC (armour, some conditions); the lowest cap wins. */
export const DexterityCapElement = z.strictObject({
  key: z.literal(RuleElementKey.DexterityCap),
  value: ModifierValue,
  ...ruleElementBase,
});
export type DexterityCapElement = z.infer<typeof DexterityCapElement>;

/** The multiple attack penalty step for the targeted attacks (`-4` for agile); the best applies. */
export const MultipleAttackPenaltyElement = z.strictObject({
  key: z.literal(RuleElementKey.MultipleAttackPenalty),
  selectors: ModifierTargets,
  value: ModifierValue,
  ...ruleElementBase,
});
export type MultipleAttackPenaltyElement = z.infer<typeof MultipleAttackPenaltyElement>;
