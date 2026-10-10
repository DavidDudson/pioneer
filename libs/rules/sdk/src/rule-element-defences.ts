import * as z from 'zod';

import { DamageAdjustmentTargetSchema, DamageExceptions } from './damage';
import { FormulaSource } from './formula-source';
import { RuleElementKey, ruleElementBase } from './rule-element-base';
import { Immunity } from './trait';
import { DamageAmount } from './units';

/** A weakness's or resistance's amount: a positive whole number, or a formula that evaluates to one. */
export const DefenceValue = z.union([DamageAmount, FormulaSource]);
export type DefenceValue = z.infer<typeof DefenceValue>;

/** Immunity to a damage type, condition or effect (`fire`, `paralyzed`, `death-effects`). */
export const ImmunityElement = z.strictObject({
  key: z.literal(RuleElementKey.Immunity),
  type: Immunity,
  exceptions: DamageExceptions.optional(),
  ...ruleElementBase,
});
export type ImmunityElement = z.infer<typeof ImmunityElement>;

const adjustmentFields = {
  type: DamageAdjustmentTargetSchema,
  value: DefenceValue,
  exceptions: DamageExceptions.optional(),
  ...ruleElementBase,
};

/** A weakness to a damage type or group (`weakness 5 fire`). */
export const WeaknessElement = z.strictObject({ key: z.literal(RuleElementKey.Weakness), ...adjustmentFields });
export type WeaknessElement = z.infer<typeof WeaknessElement>;

/** A resistance to a damage type or group (`resistance 5 physical except adamantine`). */
export const ResistanceElement = z.strictObject({ key: z.literal(RuleElementKey.Resistance), ...adjustmentFields });
export type ResistanceElement = z.infer<typeof ResistanceElement>;
