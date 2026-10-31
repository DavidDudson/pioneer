import * as z from 'zod';

import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { FormMovement } from './rule-element-battle-form';
import { Feet } from './units';

/** The most kinds of movement one element names: all of them. */
const MOVEMENTS_MAX = Object.keys(FormMovement).length;

/**
 * What entering each 5-foot square costs beyond the square itself while its predicate holds: difficult terrain 5 feet,
 * greater difficult terrain 10. The Speeds named in `movement` (land by default) drop to the distance a Stride then
 * covers, which is the Speed in whole squares of that cost, so 25 feet over difficult terrain covers 10. An immunity to
 * the terrain is a predicate on `self:immunity:<terrain>`. A Pioneer element: Foundry has no movement cost.
 */
export const MovementCostElement = z.strictObject({
  key: z.literal(RuleElementKey.MovementCost),
  extra: Feet.positive(),
  movement: z.array(z.enum(FormMovement)).min(1).max(MOVEMENTS_MAX).readonly().optional(),
  ...ruleElementBase,
});
export type MovementCostElement = z.infer<typeof MovementCostElement>;
