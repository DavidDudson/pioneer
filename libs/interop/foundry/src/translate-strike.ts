import { RuleElementKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** Foundry's damage for a `Strike` of its own: `{ base: { damageType, die, dice } }`, `dice` defaulting to 1. */
const FoundryStrikeDamage = z.strictObject({
  base: z.strictObject({
    damageType: z.string(),
    die: z.string().optional(),
    dice: z.number().int().nonnegative().optional(),
  }),
});

/**
 * A `Strike` that defines an attack of its own (claws, jaws), with its damage as Pioneer reads it: Foundry's
 * `damage.base` read out into `damage`, `dice` set to 1 when Foundry leaves it out. Its other fields (`slug`,
 * `category`, `group`, `range`, `traits`, the base `label`) are the same in both. The fist form, and a `Strike`
 * whose damage is shaped any other way (a `replaceAll`, a second damage part), is left as it is, so the element
 * fails and is kept for the backlog.
 */
export function withStrikeDamage(raw: unknown): unknown {
  if (typeof raw !== 'object' || raw === null || !('key' in raw) || raw.key !== RuleElementKey.Strike) {
    return raw;
  }
  const damage = 'damage' in raw ? FoundryStrikeDamage.safeParse(raw.damage) : undefined;
  if (damage === undefined || !damage.success) {
    return raw;
  }
  const { base } = damage.data;
  const { damageType, die, dice = 1 } = base;
  return { ...raw, damage: { dice, ...(die === undefined ? {} : { die }), damageType } };
}
