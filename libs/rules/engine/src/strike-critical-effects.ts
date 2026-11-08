import { RuleElementKey } from '@pioneer/rules/sdk';
import type { CriticalEffectElement, Origin } from '@pioneer/rules/sdk';

import type { RuleInPlay } from './rule-in-play';
import { ownsStrike, reaches } from './strike-targets';
import type { StrikeTargets } from './strike-targets';

/** What a critical hit with a Strike does besides its damage (frost's slowing, shock's arc), and the rune or feat it comes from. */
export interface CriticalEffect {
  readonly effect: CriticalEffectElement['effect'];
  readonly origin: Origin;
}

/** `effects` with what `rule` adds to them: the effect of a `CriticalEffect` element that reaches the Strike's damage. */
export function criticallyAffectedBy(
  effects: readonly CriticalEffect[],
  rule: RuleInPlay,
  targets: StrikeTargets,
): readonly CriticalEffect[] {
  const { element } = rule;
  return element.key === RuleElementKey.CriticalEffect &&
    reaches(element.selectors, targets.damage, ownsStrike(rule, targets))
    ? [...effects, { effect: element.effect, origin: rule.origin }]
    : effects;
}
