import * as z from 'zod';

import { RuleElementKey, ruleElementBase } from './rule-element-base';

/**
 * Gives the character a Strike, as Foundry pf2e's `Strike` does. Only its `fist` form so far (ADR-0047): a fist, an
 * unarmed attack of the fist base (agile, finesse, nonlethal, 1d4 bludgeoning), which a cleric whose deity favours the
 * fist has, and whose base the favoured weapon rank reaches. Strikes of other shapes join with #481.
 */
export const StrikeElement = z.strictObject({
  key: z.literal(RuleElementKey.Strike),
  fist: z.literal(true),
  ...ruleElementBase,
});
export type StrikeElement = z.infer<typeof StrikeElement>;
