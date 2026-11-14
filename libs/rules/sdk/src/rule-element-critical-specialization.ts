import * as z from 'zod';

import { RichText } from './rich-text';
import { ruleElementBase, RuleElementKey } from './rule-element-base';
import { PersistentDamage } from './weapon';

/**
 * Gives the Strikes it reaches the critical specialization effect of their weapon's group, as Foundry pf2e's
 * `CriticalSpecialization` does (ADR-0008). Its `predicate` says which weapons and when: the weapon's own roll options
 * (`item:group:sword`) and the character's. The engine adds the group's effect to the critical hit note of each Strike
 * it reaches (`criticalSpecializationOf`). A `grievous` one adds the further benefit a grievous rune gives the weapon
 * group instead (`grievousSpecializationOf`), and an `etched` one reaches only the weapon the rune is etched onto, or
 * that its own item is (a weapon's rule that names the weapon by its own id). An `alternate` one adds a second effect
 * beside the group's: its `text`, and the persistent `damageDice` the target takes (`alternateSpecializationOf`).
 */
export const CriticalSpecializationElement = z.strictObject({
  key: z.literal(RuleElementKey.CriticalSpecialization),
  grievous: z.literal(true).optional(),
  etched: z.literal(true).optional(),
  alternate: z.literal(true).optional(),
  text: RichText.optional(),
  damageDice: PersistentDamage.optional(),
  ...ruleElementBase,
});
export type CriticalSpecializationElement = z.infer<typeof CriticalSpecializationElement>;
