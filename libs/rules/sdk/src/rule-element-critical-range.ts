import { Pg } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ModifierTargets, ruleElementBase, RuleElementKey } from './rule-element-base';

/** A natural d20 result an attack needs to be a critical hit when it succeeds: from 2 to 19, the 19 of a keen weapon. */
const NATURAL_MAX = 19;
export const NaturalRoll = Pg.smallint().min(2).max(NATURAL_MAX).brand<'NaturalRoll'>();
export type NaturalRoll = z.infer<typeof NaturalRoll>;

/**
 * Makes a natural `natural` or higher on the attack roll `selectors` reach a critical hit, as long as the roll is a
 * success (a keen weapon's 19). It changes no number: the Strike shows the range, worded from the value (ADR-0009),
 * and the player reads the roll against it.
 */
export const CriticalRangeElement = z.strictObject({
  key: z.literal(RuleElementKey.CriticalRange),
  selectors: ModifierTargets,
  natural: NaturalRoll,
  ...ruleElementBase,
});
export type CriticalRangeElement = z.infer<typeof CriticalRangeElement>;
