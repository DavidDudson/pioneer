import { RuleElementKey } from '@pioneer/rules/sdk';
import type { CriticalEffectElement, CriticalTrigger, Origin } from '@pioneer/rules/sdk';

import type { RuleInPlay } from './rule-in-play';
import { ownsStrike, reaches } from './strike-targets';
import type { StrikeTargets } from './strike-targets';

/**
 * What a hit with a Strike does besides its damage (frost's slowing on a critical hit, pacifying's save on any hit), and
 * the rune or feat it comes from.
 */
export interface CriticalEffect {
  readonly effect: CriticalEffectElement['effect'];
  /** What makes it happen; a critical hit when absent. */
  readonly trigger?: CriticalTrigger | undefined;
  /** Whether the wielder spends a reaction to use it. */
  readonly reaction?: true | undefined;
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
    ? [
        ...effects,
        { effect: element.effect, trigger: element.trigger, reaction: element.reaction, origin: rule.origin },
      ]
    : effects;
}
