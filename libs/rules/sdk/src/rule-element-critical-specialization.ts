import * as z from 'zod';

import { ruleElementBase, RuleElementKey } from './rule-element-base';

/**
 * Gives the Strikes it reaches the critical specialization effect of their weapon's group, as Foundry pf2e's
 * `CriticalSpecialization` does (ADR-0008). Its `predicate` says which weapons and when: the weapon's own roll options
 * (`item:group:sword`) and the character's. The engine adds the group's effect to the critical hit note of each Strike
 * it reaches (`criticalSpecializationOf`).
 */
export const CriticalSpecializationElement = z.strictObject({
  key: z.literal(RuleElementKey.CriticalSpecialization),
  ...ruleElementBase,
});
export type CriticalSpecializationElement = z.infer<typeof CriticalSpecializationElement>;
