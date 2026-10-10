import * as z from 'zod';

import { DamageAdjustmentTargetSchema, DamageExceptions } from './damage';
import { FormulaSource } from './formula-source';
import { RuleElementKey, ruleElementBase } from './rule-element-base';
import { Immunity } from './trait';
import { DamageAmount } from './units';

const TYPES_MAX = 16;

/** A weakness's or resistance's amount: a positive whole number, or a formula that evaluates to one. */
export const DefenceValue = z.union([DamageAmount, FormulaSource]);
export type DefenceValue = z.infer<typeof DefenceValue>;

/**
 * Immunity to each of `type`: a damage type, condition or effect (`fire`, `paralyzed`, `critical-hits`). Foundry's
 * fields: `exceptions` names what it does not cover.
 */
export const ImmunityElement = z.strictObject({
  key: z.literal(RuleElementKey.Immunity),
  type: z.array(Immunity).min(1).max(TYPES_MAX).readonly(),
  exceptions: DamageExceptions.optional(),
  ...ruleElementBase,
});
export type ImmunityElement = z.infer<typeof ImmunityElement>;

const adjustmentFields = {
  /** Damage types or groups (`fire`, `physical`); each gets its own weakness or resistance. */
  type: z.array(DamageAdjustmentTargetSchema).min(1).max(TYPES_MAX).readonly(),
  value: DefenceValue,
  exceptions: DamageExceptions.optional(),
  ...ruleElementBase,
};

/** A weakness to each of `type`: the damage taken grows by `value`. */
export const WeaknessElement = z.strictObject({ key: z.literal(RuleElementKey.Weakness), ...adjustmentFields });
export type WeaknessElement = z.infer<typeof WeaknessElement>;

/** A resistance to each of `type`: the damage taken shrinks by up to `value`. */
export const ResistanceElement = z.strictObject({ key: z.literal(RuleElementKey.Resistance), ...adjustmentFields });
export type ResistanceElement = z.infer<typeof ResistanceElement>;
