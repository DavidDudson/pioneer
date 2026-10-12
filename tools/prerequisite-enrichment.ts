/**
 * The prerequisite pass over committed packs (content-model.md, "Prerequisites"; ADR-0031): each feat whose
 * prerequisites the matcher reads gets its `prerequisitePredicate`. Entries the pass doesn't change keep their JSON as
 * is.
 */
import { ContentEntry, ContentEntryFile, contentKey, ContentKind } from '@pioneer/rules/sdk';
import type { ContentKey, Predicate } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** `entry` with `prerequisitePredicate` on its feat data. */
function withPredicate(entry: ContentEntry, prerequisitePredicate: Predicate): ContentEntry {
  return entry.kind === ContentKind.Feat ? { ...entry, data: { ...entry.data, prerequisitePredicate } } : entry;
}

/**
 * A `<kind>.json` file with each matched feat's predicate set, or undefined when no entry in it matched. Only matched
 * entries are re-encoded; the rest are the file's own JSON.
 */
export function enrichPrerequisiteFile(
  file: readonly unknown[],
  matches: ReadonlyMap<ContentKey, Predicate>,
): readonly unknown[] | undefined {
  const entries = ContentEntryFile.parse(file);
  const enriched = file.map((json, index) => {
    const entry = entries[index];
    const predicate = entry === undefined ? undefined : matches.get(contentKey(entry.pack, entry.slug));
    return entry === undefined || predicate === undefined
      ? json
      : z.encode(ContentEntry, withPredicate(entry, predicate));
  });
  const changed = enriched.some((json, index) => json !== file[index]);
  return changed ? enriched : undefined;
}
