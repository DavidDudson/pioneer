import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { ModifierTargets, ruleElementBase, RuleElementKey } from './rule-element-base';
import { DamageAmount } from './units';

/**
 * The weakness a critical hit with a Strike `selectors` reaches gives its target, to `type` damage at `value`, until
 * the end of the attacker's next turn. Energy vulnerability weapon runes carry one. The Strike words it from the type
 * and amount, so the element holds no text (ADR-0009).
 */
export const CriticalWeaknessElement = z.strictObject({
  key: z.literal(RuleElementKey.CriticalWeakness),
  selectors: ModifierTargets,
  type: DamageTypeSchema,
  value: DamageAmount,
  ...ruleElementBase,
});
export type CriticalWeaknessElement = z.infer<typeof CriticalWeaknessElement>;
