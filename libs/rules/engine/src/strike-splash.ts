import { DamageAmount, DamageDiceCategory } from '@pioneer/rules/sdk';
import type { DamageDiceElement, DamageType, DiceCount, Origin } from '@pioneer/rules/sdk';

/** Flat splash damage a `DamageDice` element gives a Strike (Shockwave's), dealt to creatures near the target. */
export interface RuleSplash {
  readonly amount: DamageAmount;
  readonly damageType: DamageType;
  readonly origin: Origin;
}

/** Flat splash found, before it counts the Strike's dice: `count` of it, for each damage die when `perDie`. */
export interface PendingSplash {
  readonly count: DiceCount;
  readonly perDie: boolean;
  readonly damageType: DamageType;
  readonly origin: Origin;
}

/** Whether `element` is flat splash: category `splash` and no die. */
export function isFlatSplash(element: DamageDiceElement): boolean {
  return element.category === DamageDiceCategory.Splash && element.dieSize === undefined;
}

/** `pending` as the splash it deals when the Strike rolls `dice` damage dice; none when that is nothing. */
export function splashFor({ count, perDie, damageType, origin }: PendingSplash, dice: DiceCount): RuleSplash[] {
  const total = perDie ? count * dice : count;
  return total > 0 ? [{ amount: DamageAmount.parse(total), damageType, origin }] : [];
}
