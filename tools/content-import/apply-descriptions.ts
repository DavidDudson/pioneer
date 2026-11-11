/**
 * `just content-import --pack <pack> --book <book> --apply-descriptions trait`: fills the empty `description` of the
 * committed vocabulary entries of a kind (the traits) with the description the import now builds, and changes nothing
 * else (ADR-0031: the committed pack is the source, and later corrections to it stand). An entry with a description
 * already, a hand-written one included, keeps it; an entry the import gives none stays empty.
 */
import { BacklogItemType, VocabularyGapReason } from '@pioneer/interop/foundry';
import type { BacklogItem } from '@pioneer/interop/foundry';
import { ContentKind } from '@pioneer/rules/sdk';

type Json = unknown;
type JsonRecord = Readonly<Record<string, Json>>;

/** The kinds `--apply-descriptions` can fill: the ones the import describes from Foundry's config, not its packs. */
export const DESCRIBED_KINDS: ReadonlySet<string> = new Set([ContentKind.Trait]);

/** The import's description of each entry, by id. */
export type FreshDescriptions = ReadonlyMap<string, Json>;

/** A kind file after the merge, and how many entries it filled. */
export interface DescriptionMerge {
  readonly entries: readonly Json[];
  readonly filled: number;
}

function isRecord(node: Json): node is JsonRecord {
  return typeof node === 'object' && node !== null && !Array.isArray(node);
}

function isEmptyList(node: Json): boolean {
  return Array.isArray(node) && node.length === 0;
}

function isFilledList(node: Json): node is readonly Json[] {
  return Array.isArray(node) && node.length > 0;
}

/** The entries of one kind file with each empty description in `kinds` replaced by the import's, when it has one. */
export function withFilledDescriptions(
  entries: readonly Json[],
  fresh: FreshDescriptions,
  kinds: ReadonlySet<string>,
): DescriptionMerge {
  let filled = 0;
  const merged = entries.map((entry): Json => {
    if (!isRecord(entry) || !kinds.has(String(entry['kind'])) || !isEmptyList(entry['description'])) {
      return entry;
    }
    const description = fresh.get(String(entry['id']));
    if (!isFilledList(description)) {
      return entry;
    }
    filled += 1;
    return { ...entry, description };
  });
  return { entries: merged, filled };
}

function compare(left: string, right: string): number {
  return left.localeCompare(right);
}

type VocabularyItem = Extract<BacklogItem, { readonly type: typeof BacklogItemType.Vocabulary }>;

function isVocabulary(item: BacklogItem): item is VocabularyItem {
  return item.type === BacklogItemType.Vocabulary;
}

function isDescriptionGap(item: BacklogItem, kinds: ReadonlySet<string>): boolean {
  return isVocabulary(item) && item.reason === VocabularyGapReason.MissingDescription && kinds.has(item.kind);
}

/**
 * The backlog with the `missing-description` vocabulary items of `kinds` replaced by the import's: those it still has
 * no text for. The other items stay as they were, the vocabulary ones last and in the order the import writes them.
 */
export function withDescriptionGaps(
  backlog: readonly BacklogItem[],
  fresh: readonly BacklogItem[],
  kinds: ReadonlySet<string>,
): readonly BacklogItem[] {
  const kept = backlog.filter((item) => !isDescriptionGap(item, kinds));
  const all = [...kept, ...fresh.filter((item) => isDescriptionGap(item, kinds))];
  const others = all.filter((item) => !isVocabulary(item));
  const vocabulary = all
    .filter((item) => isVocabulary(item))
    .toSorted(
      (left, right) =>
        compare(left.kind, right.kind) || compare(left.slug, right.slug) || compare(left.reason, right.reason),
    );
  return [...others, ...vocabulary];
}
