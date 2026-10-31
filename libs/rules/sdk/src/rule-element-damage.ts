import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { FormulaSource } from './formula-source';
import { RulesMessage } from './messages';
import { ModifierTargets, ruleElementBase, RuleElementKey, RuleSlug, RuleValue } from './rule-element-base';
import { NumericAlterationMode } from './rule-element-item-alteration';
import { DiceCount, DieSize } from './weapon';

/** How damage is dealt besides its type: `precision` bonuses stack by their own rule, `persistent` damage lasts. */
export const DamageDiceCategory = { Persistent: 'persistent', Precision: 'precision', Splash: 'splash' } as const;
export type DamageDiceCategory = ValueOf<typeof DamageDiceCategory>;

/** The dice an element adds: a count, or a formula that evaluates to one. */
const DiceNumber = z.union([DiceCount, FormulaSource]);

/** What an added die takes in place of the damage it joins. */
const DamageDiceOverride = z.strictObject({ damageType: DamageTypeSchema });

/**
 * Extra damage dice on the targeted damage rolls (Elemental Ammunition's energy dice, a rogue's sneak attack), as
 * Foundry pf2e's `DamageDice` does. With a `dieSize` the element adds `diceNumber` dice of it (one by default), typed
 * `damageType` or as the damage it joins, in a `category`, and `critical` ones only on a critical hit. Without one it
 * changes the dice already there: `diceNumber` more of them, or `override`ing their type.
 */
export const DamageDiceElement = z
  .strictObject({
    key: z.literal(RuleElementKey.DamageDice),
    selectors: ModifierTargets,
    slug: RuleSlug.optional(),
    diceNumber: DiceNumber.optional(),
    dieSize: z.enum(DieSize).optional(),
    damageType: DamageTypeSchema.optional(),
    category: z.enum(DamageDiceCategory).optional(),
    critical: z.boolean().optional(),
    override: DamageDiceOverride.optional(),
    ...ruleElementBase,
  })
  .refine(
    ({ diceNumber, dieSize, override }) => diceNumber !== undefined || dieSize !== undefined || override !== undefined,
    issueParams(message(RulesMessage.DamageDiceNeedsDice)),
  );
export type DamageDiceElement = z.infer<typeof DamageDiceElement>;

/** Damage numbers an alteration can change. */
export const DamageProperty = { DiceNumber: 'dice-number', DamageType: 'damage-type' } as const;
export type DamageProperty = ValueOf<typeof DamageProperty>;

/** Fields of every alteration: the damage rolls it reaches, and the slug other elements find it by. */
const alterationBase = {
  key: z.literal(RuleElementKey.DamageAlteration),
  selectors: ModifierTargets,
  slug: RuleSlug.optional(),
};

/** Changes the dice of the targeted damage rolls: how many there are, or what type they deal. */
export const DamageAlterationElement = z.discriminatedUnion('property', [
  z.strictObject({
    ...alterationBase,
    property: z.literal(DamageProperty.DiceNumber),
    mode: z.enum(NumericAlterationMode),
    value: RuleValue,
    ...ruleElementBase,
  }),
  z.strictObject({
    ...alterationBase,
    property: z.literal(DamageProperty.DamageType),
    mode: z.literal(NumericAlterationMode.Override),
    value: DamageTypeSchema,
    ...ruleElementBase,
  }),
]);
export type DamageAlterationElement = z.infer<typeof DamageAlterationElement>;
