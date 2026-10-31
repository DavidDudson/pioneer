import type { PrerequisiteMatch } from '@pioneer/rules/catalog';
/**
 * The prerequisite pass over committed packs (content-model.md, "Prerequisites"; ADR-0031): each feat whose
 * prerequisites the matcher reads gets its `prerequisitePredicate`, and one with several clauses its
 * `prerequisiteClauses`. Entries the pass doesn't change keep their JSON as is.
 */
import { ContentEntry, ContentEntryFile, contentKey, ContentKind } from '@pioneer/rules/sdk';
import type { ContentKey } from '@pioneer/rules/sdk';
import * as z from 'zod';

/** `entry` with what `match` read set on its feat data, leaving what the match doesn't read as it is. */
function withMatch(entry: ContentEntry, match: PrerequisiteMatch): ContentEntry {
  if (entry.kind !== ContentKind.Feat) {
    return entry;
  }
  const { prerequisitePredicate, prerequisiteClauses } = match;
  return {
    ...entry,
    data: {
      ...entry.data,
      ...(prerequisitePredicate === undefined ? {} : { prerequisitePredicate }),
      ...(prerequisiteClauses === undefined ? {} : { prerequisiteClauses }),
    },
  };
}

/**
 * A `<kind>.json` file with each matched feat's predicate and clauses set, or undefined when no entry in it matched. Only matched
 * entries are re-encoded; the rest are the file's own JSON.
 */
export function enrichPrerequisiteFile(
  file: readonly unknown[],
  matches: ReadonlyMap<ContentKey, PrerequisiteMatch>,
): readonly unknown[] | undefined {
  const entries = ContentEntryFile.parse(file);
  const enriched = file.map((json, index) => {
    const entry = entries[index];
    const match = entry === undefined ? undefined : matches.get(contentKey(entry.pack, entry.slug));
    return entry === undefined || match === undefined ? json : z.encode(ContentEntry, withMatch(entry, match));
  });
  const changed = enriched.some((json, index) => json !== file[index]);
  return changed ? enriched : undefined;
}
