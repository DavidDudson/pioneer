import { OriginHopKind, SlotKey, Take, UNLIMITED } from '@pioneer/rules/sdk';
import type { ChoiceValue, ContentId, OriginHop, RuleIndex } from '@pioneer/rules/sdk';

import type { ChoicePicks } from './choices';
import type { GrantEntry } from './grant-entry';

/** The take every entry has at least: the one an entry taken once is. */
export const FIRST_TAKE = Take.parse(1);

/**
 * The slot of rule `rule` on a take of entry `entry`. A take of a repeatable feat that a pick put there is named by
 * the slot that was picked (`via`), so its key stays the same when another slot is filled and the takes renumber; any
 * other take is the entry's only one. The key is `<entry>:<rule>`, or `<entry>:via-<slot>:<rule>` with `via`.
 */
export function slotKeyOf(entry: ContentId, rule: RuleIndex, via?: SlotKey): SlotKey {
  return SlotKey.parse(via === undefined ? `${entry}:${rule}` : `${entry}:via-${via}:${rule}`);
}

/** The slot whose pick put a repeatable `entry` on the character along `hops`, if one did. */
export function viaOf(entry: GrantEntry, hops: readonly OriginHop[]): SlotKey | undefined {
  if (entry.maxTakable === undefined) {
    return undefined;
  }
  const hop = hops.findLast((candidate) => candidate.kind === OriginHopKind.Choice);
  return hop?.kind === OriginHopKind.Choice ? hop.slot : undefined;
}

/**
 * The take an entry already on the character, `taken` times, goes on as when a pick puts it there again: the next one
 * for a feat that can be taken more often, none for any other entry (a duplicate). An entry granted outright by
 * another entry is never taken again.
 */
export function nextTake(entry: GrantEntry, taken: Take, picked: boolean): Take | undefined {
  const { maxTakable } = entry;
  const more = maxTakable !== undefined && (maxTakable === UNLIMITED || taken < maxTakable);
  return picked && more ? Take.parse(taken + 1) : undefined;
}

/** Which rule of which entry, and the `via` of each earlier take of the entry, in take order. */
interface EarlierTakes {
  readonly entry: ContentId;
  readonly rule: RuleIndex;
  readonly before: readonly (SlotKey | undefined)[];
}

/**
 * What the earlier takes of `entry` picked for rule `rule`. A repeatable feat takes a different pick each time (a
 * different domain, a different warden spell), so a later take is not offered them.
 */
export function earlierPicks({ entry, rule, before }: EarlierTakes, picks: ChoicePicks): ReadonlySet<ChoiceValue> {
  const found = new Set<ChoiceValue>();
  for (const via of before) {
    const value = picks.get(slotKeyOf(entry, rule, via));
    if (value !== undefined) {
      found.add(value);
    }
  }
  return found;
}
