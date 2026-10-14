import { ContentKindSchema } from '@pioneer/rules/sdk';
import type { BookId, ContentKind } from '@pioneer/rules/sdk';

import type { FoundryItemType } from './foundry-document';
import type { Selection, SkipReason } from './select-entries';
import { SkipReason as Reason } from './select-entries';
import type { EnvelopeTranslation } from './translate-envelope';
import type { ImportTranslation } from './translate-import';

/** What an import would bring in, by Foundry type and book, and what it would leave out, by reason. */

export interface ImportCount {
  readonly type: FoundryItemType;
  readonly book: BookId;
  readonly count: number;
}

export interface SkipCount {
  readonly reason: SkipReason;
  /** The Foundry type, publication title or book the reason is about; empty where a per-entry detail would not group. */
  readonly detail: string;
  readonly count: number;
}

export interface DryRunReport {
  readonly imported: readonly ImportCount[];
  readonly skipped: readonly SkipCount[];
}

const REASON_ORDER: readonly SkipReason[] = Object.values(Reason);
/**
 * Reasons counted as one group whatever the detail: parse errors differ per file (the CLI lists them), and legacy
 * entries span a hundred pre-remaster books that need no action.
 */
const UNGROUPED: ReadonlySet<SkipReason> = new Set([Reason.Unreadable, Reason.Legacy]);

function tally<Key>(keys: readonly Key[], keyOf: (key: Key) => string): Map<string, [Key, number]> {
  const counts = new Map<string, [Key, number]>();
  for (const key of keys) {
    const id = keyOf(key);
    const [, count] = counts.get(id) ?? [key, 0];
    counts.set(id, [key, count + 1]);
  }
  return counts;
}

export function dryRunReport({ selected, skipped }: Selection): DryRunReport {
  const imported = [...tally(selected, ({ type, book }) => `${book}\u0000${type}`).values()]
    .map(([{ type, book }, count]) => ({ type, book, count }))
    .toSorted((left, right) => left.book.localeCompare(right.book) || left.type.localeCompare(right.type));
  const grouped = skipped.map(({ reason, detail }) => ({ reason, detail: UNGROUPED.has(reason) ? '' : detail }));
  const skips = [...tally(grouped, ({ reason, detail }) => `${reason}\u0000${detail}`).values()]
    .map(([{ reason, detail }, count]) => ({ reason, detail, count }))
    .toSorted(
      (left, right) =>
        REASON_ORDER.indexOf(left.reason) - REASON_ORDER.indexOf(right.reason) ||
        right.count - left.count ||
        left.detail.localeCompare(right.detail),
    );
  return { imported, skipped: skips };
}

export interface KeyCount {
  /** A failure reason, rule element key, trait, description markup or enricher. */
  readonly key: string;
  readonly count: number;
}

/** What translating the selected entries' envelopes left over, each list most frequent first. */
export interface TranslationReport {
  readonly entries: number;
  readonly failures: readonly KeyCount[];
  readonly untranslatedRules: readonly KeyCount[];
  /** By key and reason (`TokenLight token-only`): dropped on purpose, so not gaps. */
  readonly droppedRules: readonly KeyCount[];
  readonly unknownTraits: readonly KeyCount[];
  /** By entries that use it. */
  readonly unknownMarkup: readonly KeyCount[];
  /** By entries that use it. */
  readonly untranslatedEnrichers: readonly KeyCount[];
  /** By reason and key (`missing-key PF2E.SpecificRule.Prompt.Skill`). */
  readonly unresolvedText: readonly KeyCount[];
}

function keyCounts(keys: readonly string[]): readonly KeyCount[] {
  return [...tally(keys, (key) => key).values()]
    .map(([key, count]) => ({ key, count }))
    .toSorted((left, right) => right.count - left.count || left.key.localeCompare(right.key));
}

export function translationReport({
  entries,
  failures,
  untranslatedRules,
  droppedRules,
  unknownTraits,
  unknownMarkup,
  untranslatedEnrichers,
  unresolvedText,
}: EnvelopeTranslation): TranslationReport {
  return {
    entries: entries.length,
    failures: keyCounts(failures.map(({ reason }) => reason)),
    untranslatedRules: keyCounts(untranslatedRules.map(({ key }) => key)),
    droppedRules: keyCounts(droppedRules.map(({ key, reason }) => `${key} ${reason}`)),
    unknownTraits: keyCounts(unknownTraits.map(({ trait }) => trait)),
    unknownMarkup: keyCounts(unknownMarkup.map(({ markup }) => markup)),
    untranslatedEnrichers: keyCounts(untranslatedEnrichers.map(({ enricher }) => enricher)),
    unresolvedText: keyCounts(unresolvedText.map(({ reason, key }) => `${reason} ${key}`)),
  };
}

export interface KindCount {
  readonly kind: ContentKind;
  readonly count: number;
}

/** What building kind data and vocabulary entries brought in and left over, each list most frequent first. */
export interface KindDataReport {
  readonly kindData: readonly KindCount[];
  readonly vocabulary: readonly KindCount[];
  /** By reason and field (`unmapped-field deathNote`). */
  readonly kindDataGaps: readonly KeyCount[];
  /** By kind and reason (`language unmapped-value`). */
  readonly vocabularyGaps: readonly KeyCount[];
}

function kindCounts(kinds: readonly ContentKind[]): readonly KindCount[] {
  return keyCounts(kinds).map(({ key, count }) => ({ kind: ContentKindSchema.parse(key), count }));
}

export function kindDataReport({
  entries,
  archetypes,
  vocabulary,
  kindDataGaps,
  vocabularyGaps,
}: ImportTranslation): KindDataReport {
  return {
    kindData: kindCounts([
      ...entries.flatMap(({ kindData }) => (kindData === undefined ? [] : [kindData.kind])),
      ...archetypes.map(({ kindData }) => kindData.kind),
    ]),
    vocabulary: kindCounts(vocabulary.map(({ kindData }) => kindData.kind)),
    kindDataGaps: keyCounts(kindDataGaps.map(({ reason, field }) => `${reason} ${field}`)),
    vocabularyGaps: keyCounts(vocabularyGaps.map(({ kind, reason }) => `${kind} ${reason}`)),
  };
}
