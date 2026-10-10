import {
  ChoiceValue,
  contentId,
  ContentId,
  ContentText,
  PackId,
  RuleElement,
  RuleIndex,
  SlotKey,
  Slug,
  SourceRef,
} from '@pioneer/rules/sdk';

import { slotKeyOf } from '../choices';
import type { ChoicePicks } from '../choices';
import type { ContentLookup, GrantEntry, GrantRoot } from '../grant-entry';

const TEST_PACK = PackId.parse('grants-test');
const TEST_PAGE = SourceRef.parse({ kind: 'book', book: 'player-core', page: 1 });

/** The id of the test pack's entry `slug`. */
export function idOf(slug: string): ContentId {
  return ContentId.parse(contentId(TEST_PACK, Slug.parse(slug)));
}

/** A `GrantItem` of the test pack's entry `slug`, as JSON. Spread it to add fields. */
export function grantOf(slug: string): object {
  return { key: 'GrantItem', item: idOf(slug) };
}

/** The test pack's entry `slug`, named after it, with `rules` as JSON. */
export function entry(slug: string, rules: readonly object[] = []): GrantEntry {
  return {
    id: idOf(slug),
    name: ContentText.parse(slug),
    rules: rules.map((rule) => RuleElement.parse(rule)),
    sources: [TEST_PAGE],
  };
}

/** Looks entries up by id among `entries`. */
export function lookupOf(entries: readonly GrantEntry[]): ContentLookup {
  const byId = new Map(entries.map((found) => [found.id, found]));
  return (id: ContentId): GrantEntry | undefined => byId.get(id);
}

/** The player picked the test pack's entry `slug` for `slot`. */
export function picked(slug: string, slot = slug): GrantRoot {
  return { entry: idOf(slug), hop: { kind: 'choice', slot: SlotKey.parse(slot) } };
}

/** The player's picks, as `[slot, value]` pairs. */
export function picksOf(pairs: readonly (readonly [SlotKey, string])[] = []): ChoicePicks {
  return new Map(pairs.map(([slot, value]) => [slot, ChoiceValue.parse(value)]));
}

/** The slot of rule `rule` on the test pack's entry `slug`. */
export function slotOf(slug: string, rule: number): SlotKey {
  return slotKeyOf(idOf(slug), RuleIndex.parse(rule));
}
