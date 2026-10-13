import type { RuleInPlay } from '@pioneer/rules/engine';
import { resolvedRules } from '@pioneer/rules/grants';
import type { GrantResolution } from '@pioneer/rules/grants';

/** Each rule element of each entry in the effective set, with the entry's origin and its place in the entry's rules. */
export function grantedRules(resolution: GrantResolution): readonly RuleInPlay[] {
  return resolvedRules(resolution).map(({ element, origin, rule }) => ({ element, origin, rule }));
}
