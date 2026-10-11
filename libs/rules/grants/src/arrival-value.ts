import { ConditionValue, ContentKind, OriginHopKind } from '@pioneer/rules/sdk';
import type { OriginHop } from '@pioneer/rules/sdk';

import type { GrantEntry } from './grant-entry';

/** A valued condition's value when it is not given one: Foundry's badge default. */
const DEFAULT_VALUE = ConditionValue.parse(1);

/**
 * The value `entry` arrives with by `hops`: a root's condition hop gives its own, and a grant of a valued condition
 * gives `granted`, the granting element's value, else 1. Anything else arrives with none.
 */
export function arrivalValue(
  entry: GrantEntry,
  hops: readonly OriginHop[],
  granted: ConditionValue | undefined,
): ConditionValue | undefined {
  const hop = hops.at(-1);
  if (entry.kind !== ContentKind.Condition) {
    return undefined;
  }
  if (hop?.kind === OriginHopKind.Condition) {
    return hop.condition === entry.id ? hop.value : undefined;
  }
  return hop?.kind === OriginHopKind.Grant && entry.valued === true ? (granted ?? DEFAULT_VALUE) : undefined;
}
