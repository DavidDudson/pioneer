import * as z from 'zod';

import { ContentId } from './content-id';
import { RuleElementKey } from './rule-key';

/** A class carries its whole progression as rule elements, so the cap is generous. */
export const RULES_MAX = 256;

/**
 * What the content model knows of a rule element: its `key`, and whatever else it carries, passed through untouched.
 * A full `RuleElement` is assignable to it; parse with `RuleElements` where the elements themselves are read.
 */
const RuleReference = z.looseObject({ key: z.enum(RuleElementKey) });

/** A content entry's `rules` as the content model holds them: references, in order. */
export const RuleReferences = z.array(RuleReference).max(RULES_MAX).readonly();

export type RuleReferences = z.infer<typeof RuleReferences>;

/** A `GrantItem` of a content id with no predicate: it always applies. */
const UnconditionalGrant = z.looseObject({
  key: z.literal(RuleElementKey.GrantItem),
  item: ContentId,
  predicate: z.undefined().optional(),
});

/** The items `rules` always grants: every `GrantItem` of a content id that sits behind no predicate. */
export function unconditionalGrants(rules: RuleReferences): ReadonlySet<ContentId> {
  const granted = new Set<ContentId>();

  for (const rule of rules) {
    const grant = UnconditionalGrant.safeParse(rule);

    if (grant.success) {
      granted.add(grant.data.item);
    }
  }

  return granted;
}
