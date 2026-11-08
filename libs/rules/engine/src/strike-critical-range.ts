import { RuleElementKey } from '@pioneer/rules/sdk';
import type { NaturalRoll, Origin } from '@pioneer/rules/sdk';

import type { RuleInPlay } from './rule-in-play';
import { ownsStrike, reaches } from './strike-targets';
import type { StrikeTargets } from './strike-targets';

/** The natural roll from which a Strike's attack is a critical hit if it succeeds (a keen weapon's 19), and what gives it. */
export interface CriticalRange {
  readonly natural: NaturalRoll;
  readonly origin: Origin;
}

/** `range` or, when `rule` is a `CriticalRange` element that reaches the Strike and reaches lower, the range it gives. */
export function criticallyRangedBy(
  range: CriticalRange | undefined,
  rule: RuleInPlay,
  targets: StrikeTargets,
): CriticalRange | undefined {
  const { element } = rule;
  if (
    element.key !== RuleElementKey.CriticalRange ||
    !reaches(element.selectors, targets.attack, ownsStrike(rule, targets))
  ) {
    return range;
  }
  return range === undefined || element.natural < range.natural
    ? { natural: element.natural, origin: rule.origin }
    : range;
}
