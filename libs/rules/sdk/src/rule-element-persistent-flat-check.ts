import * as z from 'zod';

import { DamageTypeSchema } from './damage';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { Dc } from './units';

const DAMAGE_TYPES_MAX = 16;

/**
 * The flat check that ends persistent damage of each of `damageTypes` is against `dc` instead of 15, and against
 * `assistedDc` instead of 10 with assisted recovery; no `assistedDc` means assistance ends the damage outright.
 * Quenching armour runes carry one. The lowest DC of the elements in play counts. The sheet words nothing from it:
 * the turn-end log shows the DC the check was rolled against (ADR-0009).
 */
export const PersistentFlatCheckElement = z.strictObject({
  key: z.literal(RuleElementKey.PersistentFlatCheck),
  damageTypes: z.array(DamageTypeSchema).min(1).max(DAMAGE_TYPES_MAX).readonly(),
  dc: Dc,
  assistedDc: Dc.optional(),
  ...ruleElementBase,
});
export type PersistentFlatCheckElement = z.infer<typeof PersistentFlatCheckElement>;
