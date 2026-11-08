import { RuleElementKey } from '@pioneer/rules/sdk';
import type { DamageAmount, DamageType, Origin } from '@pioneer/rules/sdk';

import type { RuleInPlay } from './rule-in-play';
import { ownsStrike, reaches } from './strike-targets';
import type { StrikeTargets } from './strike-targets';

/** The weakness a critical hit with a Strike gives its target (energy vulnerability): to `damageType` damage, by `amount`. */
export interface CriticalWeakness {
  readonly damageType: DamageType;
  readonly amount: DamageAmount;
  readonly origin: Origin;
}

/** `weaknesses` with what `rule` adds to them: the weakness of a `CriticalWeakness` element that reaches the Strike's damage. */
export function weakenedBy(
  weaknesses: readonly CriticalWeakness[],
  rule: RuleInPlay,
  targets: StrikeTargets,
): readonly CriticalWeakness[] {
  const { element } = rule;
  return element.key === RuleElementKey.CriticalWeakness &&
    reaches(element.selectors, targets.damage, ownsStrike(rule, targets))
    ? [...weaknesses, { damageType: element.type, amount: element.value, origin: rule.origin }]
    : weaknesses;
}
