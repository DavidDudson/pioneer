import { Domain } from '@pioneer/rules/sdk';
import type {
  DamageType,
  DiceCount,
  DieSize,
  ModifierTarget,
  Origin,
  RollOptionTail,
  WeaponGroup,
} from '@pioneer/rules/sdk';

import { inventoryItemOf } from './rule-in-play';
import type { RuleInPlay } from './rule-in-play';

/** The weapon a Strike's rule elements are read for: its dice and type, and the selectors of its two rolls. */
export interface StrikeTargets {
  readonly dice: DiceCount;
  readonly die: DieSize | undefined;
  readonly damageType: DamageType;
  /** The weapon's origin, which says what inventory item it is (`ETCHED_DAMAGE`). */
  readonly origin?: Origin | undefined;
  /** The weapon's group and its own roll options, which a `CriticalSpecialization` element reads. */
  readonly group?: WeaponGroup | undefined;
  readonly rollOptions?: readonly RollOptionTail[] | undefined;
  /** The selectors and domains of the Strike's attack roll. */
  readonly attack: ReadonlySet<ModifierTarget>;
  /** The selectors and domains of the Strike's damage roll. */
  readonly damage: ReadonlySet<ModifierTarget>;
}

/** The domain every roll belongs to. */
const ALL = Domain.parse('all');

/**
 * The damage roll of the weapon an element's item is etched on: a property rune's elements aim at the weapon it is
 * etched on, not at every Strike the character has. An element that names it reaches a Strike only when it comes from
 * the same inventory item as the Strike's weapon.
 */
export const ETCHED_DAMAGE = Domain.parse('etched-damage');

/** Whether the rule comes from the inventory item the Strike's weapon is. */
export function ownsStrike(rule: RuleInPlay, { origin }: StrikeTargets): boolean {
  const item = inventoryItemOf(rule.origin);
  return item !== undefined && item === inventoryItemOf(origin);
}

/** Whether `targets` reach one of `reached`; `etched` says whether the element comes from the Strike's own item. */
export function reaches(
  targets: readonly ModifierTarget[],
  reached: ReadonlySet<ModifierTarget>,
  etched: boolean,
): boolean {
  return reached.has(ALL) || targets.some((target) => (target === ETCHED_DAMAGE ? etched : reached.has(target)));
}
