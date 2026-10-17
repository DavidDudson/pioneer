import { contentKey, ContentKind, SourceKind, slugKind } from '@pioneer/rules/sdk';
import type { ContentEntry, CreatureRole } from '@pioneer/rules/sdk';

import { BacklogGapType, BacklogItemType } from './import-backlog';
import type { BacklogEntryItem, BacklogGap, BacklogItem } from './import-backlog';

/**
 * Content coverage per kind (content-model.md, "Coverage report"), over a set of entries and the backlogs they were
 * imported with: what the importer prints after a run and `tools/content-coverage.ts` prints over the committed
 * packs. Milestone exit criteria are written against these numbers.
 */

export interface KindCoverage {
  readonly kind: ContentKind;
  readonly entries: number;
  /** Entries with no rule element in the backlog: none untranslated, none dropped for a missing reference. */
  readonly rulesTranslated: number;
  /** Entries with nothing in the backlog at all. */
  readonly complete: number;
  /** Entries citing a book with a page number. */
  readonly withPage: number;
  /** Entries citing a book with an AoN link. */
  readonly withAon: number;
  /** Backlog entries left out of the pack. */
  readonly leftOut: number;
}

const RULE_GAPS: ReadonlySet<BacklogGapType> = new Set([BacklogGapType.Rule, BacklogGapType.Reference]);

function isEntryItem(item: BacklogItem): item is BacklogEntryItem {
  return item.type === BacklogItemType.Entry;
}

function hasRuleGap(gaps: readonly BacklogGap[]): boolean {
  return gaps.some(({ type }) => RULE_GAPS.has(type));
}

function cites(entry: ContentEntry, located: 'page' | 'aon'): boolean {
  return entry.sources.some((source) => source.kind === SourceKind.Book && source[located] !== undefined);
}

function count<Item>(items: readonly Item[], test: (item: Item) => boolean): number {
  return items.filter((item) => test(item)).length;
}

function kindCoverage(
  kind: ContentKind,
  entries: readonly ContentEntry[],
  items: readonly BacklogEntryItem[],
): KindCoverage {
  const gaps = new Map(items.map((item) => [contentKey(item.pack, item.slug), item.gaps]));
  const gapsOf = (entry: ContentEntry): readonly BacklogGap[] => gaps.get(contentKey(entry.pack, entry.slug)) ?? [];
  return {
    kind,
    entries: entries.length,
    rulesTranslated: count(entries, (entry) => !hasRuleGap(gapsOf(entry))),
    complete: count(entries, (entry) => gapsOf(entry).length === 0),
    withPage: count(entries, (entry) => cites(entry, 'page')),
    withAon: count(entries, (entry) => cites(entry, 'aon')),
    leftOut: count(items, ({ leftOut }) => leftOut !== undefined),
  };
}

/** Coverage per kind, sorted by kind, over `entries` and the `backlog` items about them or left out of them. */
export function importCoverage(
  entries: readonly ContentEntry[],
  backlog: readonly BacklogItem[],
): readonly KindCoverage[] {
  const items = backlog.filter((item) => isEntryItem(item));
  const kinds = new Set<ContentKind>([...entries.map(({ kind }) => kind), ...items.map(({ slug }) => slugKind(slug))]);
  return [...kinds].toSorted().map((kind) =>
    kindCoverage(
      kind,
      entries.filter((entry) => entry.kind === kind),
      items.filter(({ slug }) => slugKind(slug) === kind),
    ),
  );
}

/** How many creatures there are of one role and level. */
export interface CreatureCoverage {
  readonly role: CreatureRole;
  readonly level: number;
  readonly count: number;
}

/** Creatures per role and level, roles then levels ascending, over the creature entries among `entries`. */
export function creatureCoverage(entries: readonly ContentEntry[]): readonly CreatureCoverage[] {
  const counts = new Map<string, CreatureCoverage>();
  for (const entry of entries) {
    if (entry.kind === ContentKind.Creature) {
      const { role } = entry.data;
      const { level } = entry;
      const key = `${role}\u0000${level}`;
      counts.set(key, { role, level, count: (counts.get(key)?.count ?? 0) + 1 });
    }
  }
  return [...counts.values()].toSorted(
    (left, right) => left.role.localeCompare(right.role) || left.level - right.level,
  );
}
