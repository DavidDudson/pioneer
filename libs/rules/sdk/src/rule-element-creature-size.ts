import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { SizeSchema } from './size';
import { Feet } from './units';

/** How many sizes a creature grows (positive) or shrinks (negative) at once; no creature moves further than three. */
export const SIZE_STEPS_MAX = 3;

/** A change of size in steps: 1 is one size larger. */
export const SizeSteps = Pg.smallint().min(-SIZE_STEPS_MAX).max(SIZE_STEPS_MAX).brand<'SizeSteps'>();
export type SizeSteps = z.infer<typeof SizeSteps>;

/** The reach a size change sets: either a reach of its own, or a number of feet more than the new size gives. */
const SizeReach = z.union([z.strictObject({ override: Feet }), z.strictObject({ add: Feet })]);

/**
 * Changes the character's size, as Foundry pf2e's `CreatureSize` does: to the size named in `value`, or by that many
 * steps (1 is one larger, up to `maximumSize`). `resizeEquipment` makes the gear grow or shrink with it, and `reach`
 * replaces the reach the new size gives or adds to it.
 */
export const CreatureSizeElement = z.strictObject({
  key: z.literal(RuleElementKey.CreatureSize),
  value: z.union([SizeSchema, SizeSteps]),
  resizeEquipment: z.boolean().optional(),
  maximumSize: SizeSchema.optional(),
  reach: SizeReach.optional(),
  ...ruleElementBase,
});
export type CreatureSizeElement = z.infer<typeof CreatureSizeElement>;

export { BattleFormElement } from './rule-element-battle-form';
