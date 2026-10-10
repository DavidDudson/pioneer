import {
  ChoiceValue,
  contentId,
  ContentId,
  ContentKind,
  ContentText,
  PackId,
  RollOption,
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

/** The test pack's entry `slug`, named after it, with `rules` as JSON. A class feature unless `feat` says otherwise. */
export function entry(slug: string, rules: readonly object[] = []): GrantEntry {
  return {
    id: idOf(slug),
    kind: ContentKind.ClassFeature,
    name: ContentText.parse(slug),
    rules: rules.map((rule) => RuleElement.parse(rule)),
    sources: [TEST_PAGE],
    rollOptions: [],
  };
}

/** A feat of the test pack named `name`, with its own roll options (`trait:fighter`, `level:1`). */
export function feat(slug: string, options: readonly string[], name = slug): GrantEntry {
  return {
    ...entry(slug),
    kind: ContentKind.Feat,
    name: ContentText.parse(name),
    rollOptions: options.map((option) => RollOption.parse(option)),
  };
}

/** Looks entries up by id, and lists them by kind, among `entries`. */
export function lookupOf(entries: readonly GrantEntry[]): ContentLookup {
  const byId = new Map(entries.map((found) => [found.id, found]));
  const byKind = Map.groupBy(entries, (found) => found.kind);
  return {
    entry: (id: ContentId): GrantEntry | undefined => byId.get(id),
    ofKind: (kind: ContentKind): readonly GrantEntry[] => byKind.get(kind) ?? [],
  };
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
