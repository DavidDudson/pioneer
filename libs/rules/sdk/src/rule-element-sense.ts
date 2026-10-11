import * as z from 'zod';

import { ContentId } from './content-id';
import { RuleElementKey, ruleElementBase } from './rule-element-base';
import { SenseAcuitySchema } from './sense';
import { Feet } from './units';

/**
 * Gives the character a sense: a `sense` entry of the `core-rules` vocabulary (darkvision, scent, tremorsense), with
 * Foundry's `acuity` and `range`. Without an acuity the sense is precise, and without a range it reaches as far as the
 * character can perceive, as in Foundry; a sense whose definition fixes either (`SenseData`) keeps its own. Where two
 * grant one sense, the better acuity and the longer range win (rules-engine.md, "Senses").
 */
export const SenseElement = z.strictObject({
  key: z.literal(RuleElementKey.Sense),
  sense: ContentId,
  acuity: SenseAcuitySchema.optional(),
  /** How far the sense reaches; above 0. */
  range: Feet.positive().optional(),
  ...ruleElementBase,
});
export type SenseElement = z.infer<typeof SenseElement>;
