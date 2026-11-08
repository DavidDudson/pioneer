import * as z from 'zod';

import { ModifierTargets, ruleElementBase, RuleElementKey } from './rule-element-base';
import { Dc } from './units';

/**
 * A flat check the wearer makes each time a critical hit lands on a statistic `selectors` reaches (`ac`): against
 * `dc`, and on a success the critical hit is a hit instead. Fortification armour runes carry one. The sheet words it
 * from the DC, so the element holds no text (ADR-0009), and the player rolls the check from the defence it belongs to.
 */
export const CriticalHitCheckElement = z.strictObject({
  key: z.literal(RuleElementKey.CriticalHitCheck),
  selectors: ModifierTargets,
  dc: Dc,
  ...ruleElementBase,
});
export type CriticalHitCheckElement = z.infer<typeof CriticalHitCheckElement>;
