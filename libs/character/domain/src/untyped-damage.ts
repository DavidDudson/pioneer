import { DamageTotal } from '@pioneer/rules/dice';
import type { DamageApplication } from '@pioneer/rules/dice';
import type { HitPoints } from '@pioneer/rules/sdk';

/** Damage entered by hand, with no roll behind it: one untyped instance, taken in full, from a critical hit when `critical`. */
export function untypedDamage(amount: HitPoints, critical = false): DamageApplication {
  const total = DamageTotal.parse(amount);
  const none = DamageTotal.parse(0);
  return {
    critical,
    immediate: [{ rolled: total, dealt: total, taken: total, lines: [] }],
    persistent: [],
    taken: total,
    persistentTaken: none,
  };
}
