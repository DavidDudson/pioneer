import type { RuleInPlay } from '@pioneer/rules/engine';
import type { GrantResolution } from '@pioneer/rules/grants';
import { RuleIndex } from '@pioneer/rules/sdk';

/** Each rule element of each entry in the effective set, with the entry's origin and its place in the entry's rules. */
export function grantedRules(resolution: GrantResolution): readonly RuleInPlay[] {
  return resolution.items.flatMap(({ entry, origin }) =>
    entry.rules.map((element, rule) => ({ element, origin, rule: RuleIndex.parse(rule) })),
  );
}
