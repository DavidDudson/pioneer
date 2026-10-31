import { RuleElementKey } from '@pioneer/rules/sdk';
import type {
  ConditionValue,
  GrantItemElement,
  Origin,
  OriginHop,
  RuleElement,
  RuleSlug,
  Take,
} from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { arrivalValue } from './arrival-value';
import type { GrantEntry, GrantRoot } from './grant-entry';
import type { GrantedItem } from './grant-walk';
import { GrantsMessage } from './messages';
import { byCodeUnit } from './order';

/** Longest chain followed; matches the most hops an `Origin` records. */
const HOPS_MAX = 64;
const LIST_SEPARATOR = ', ';

/** How an entry is reached: the hops to it, the entries above it, and what the granting element asked for. */
export interface Visit {
  readonly hops: readonly OriginHop[];
  readonly chain: readonly GrantEntry[];
  readonly flag: RuleSlug | undefined;
  readonly allowDuplicate: boolean;
  /** Whether a player's pick put it here: a root slot's, or a `ChoiceSet`'s granted by `GrantItem { choice }`. */
  readonly picked: boolean;
  /** The value the granting element gives a valued condition, if it gives one. */
  readonly value: ConditionValue | undefined;
}

export function originOf(entry: GrantEntry, hops: readonly OriginHop[]): Origin {
  return { hops: [...hops], entry: entry.id, sources: [...entry.sources] };
}

/** Why `entry` cannot be followed from here: it is already above itself, or the chain is too long. */
export function blockedAt(entry: GrantEntry, visit: Visit): MessageDescriptor | undefined {
  const start = visit.chain.findIndex((above) => above.id === entry.id);
  if (start !== -1) {
    const loop = visit.chain.slice(start);
    const entries = loop.map((member) => member.name).join(LIST_SEPARATOR);
    return message(GrantsMessage.Cycle, { entries, count: loop.length });
  }
  return visit.hops.length > HOPS_MAX ? message(GrantsMessage.TooDeep, { maximum: HOPS_MAX }) : undefined;
}

/** `entry` as take `take` of it, put on the character the way `visit` says. */
export function itemOf(entry: GrantEntry, take: Take, visit: Visit): GrantedItem {
  return {
    entry,
    origin: originOf(entry, visit.hops),
    take,
    flag: visit.flag,
    value: arrivalValue(entry, visit.hops, visit.value),
  };
}

export function isGrant(element: RuleElement): element is GrantItemElement {
  return element.key === RuleElementKey.GrantItem;
}

/** Roots in entry id order, then by how they got there, so the order they are given in never matters. */
export function byEntry(left: GrantRoot, right: GrantRoot): number {
  return byCodeUnit(left.entry, right.entry) || byCodeUnit(JSON.stringify(left.hop), JSON.stringify(right.hop));
}
