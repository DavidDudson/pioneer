import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { ModifierValue } from './rule-element-numbers';
import { uniqueItems } from './unique-items';

const DEACTIVATORS_MAX = 8;

/** What kind of recovery a `FastHealing` is. Regeneration also stops the creature's wounds from dying it. */
export const FastHealingType = { FastHealing: 'fast-healing', Regeneration: 'regeneration' } as const;

/**
 * Hit Points the character regains at the start of each turn, as Foundry pf2e's `FastHealing` does. `type` is fast
 * healing unless it says regeneration. Damage of a `deactivatedBy` type switches it off until the next turn.
 */
export const FastHealingElement = z.strictObject({
  key: z.literal(RuleElementKey.FastHealing),
  value: ModifierValue,
  type: z.enum(FastHealingType).optional(),
  deactivatedBy: z.array(DamageTypeSchema).min(1).max(DEACTIVATORS_MAX).readonly().check(uniqueItems).optional(),
  ...ruleElementBase,
});
export type FastHealingElement = z.infer<typeof FastHealingElement>;

/** Temporary Hit Points the element gives the character, as Foundry pf2e's `TempHP` does. */
export const TempHPElement = z.strictObject({
  key: z.literal(RuleElementKey.TempHP),
  value: ModifierValue,
  ...ruleElementBase,
});
export type TempHPElement = z.infer<typeof TempHPElement>;
