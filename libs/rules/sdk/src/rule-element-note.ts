import * as z from 'zod';

import { ContentText } from './content-text';
import { DegreeOfSuccessSchema } from './degree-of-success';
import { RichText } from './rich-text';
import { ModifierTargets, RuleElementKey, ruleElementBase } from './rule-element-base';
import { uniqueItems } from './unique-items';

const OUTCOMES_MAX = 4;

/**
 * A note shown with the targeted rolls (an ammunition's effect on a hit, a feat's result on a critical success), as
 * Foundry pf2e's `Note` does. With `outcome` it shows only on those degrees of success. `title` heads the note, and
 * `text` is its wording.
 */
export const NoteElement = z.strictObject({
  key: z.literal(RuleElementKey.Note),
  selectors: ModifierTargets,
  title: ContentText.optional(),
  text: RichText,
  outcome: z.array(DegreeOfSuccessSchema).min(1).max(OUTCOMES_MAX).readonly().check(uniqueItems).optional(),
  ...ruleElementBase,
});
export type NoteElement = z.infer<typeof NoteElement>;
