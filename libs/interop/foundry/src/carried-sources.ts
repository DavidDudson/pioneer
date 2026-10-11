import { contentKey, SourceKind } from '@pioneer/rules/sdk';
import type { BookId, ContentEntry, SourceRef } from '@pioneer/rules/sdk';

/**
 * Page numbers and AoN links the replaced pack already had (content-model.md, "Foundry import"): an imported entry
 * cites its book alone, so each of its book sources takes the page and AoN link of the same book's source on the
 * committed entry with the same pack and slug. What the imported source already has is kept; everything else about
 * the entry is the import's.
 */

type BookSource = Extract<SourceRef, { readonly kind: typeof SourceKind.Book }>;

function bookSources(entry: ContentEntry): ReadonlyMap<BookId, BookSource> {
  return new Map(
    entry.sources.flatMap((source) => (source.kind === SourceKind.Book ? [[source.book, source] as const] : [])),
  );
}

function located(source: SourceRef, previous: ReadonlyMap<BookId, BookSource>): SourceRef {
  if (source.kind !== SourceKind.Book) {
    return source;
  }
  const before = previous.get(source.book);
  const page = source.page ?? before?.page;
  const aon = source.aon ?? before?.aon;
  return {
    ...source,
    ...(page === undefined ? {} : { page }),
    ...(aon === undefined ? {} : { aon }),
  };
}

/** `entries`, each with the page and AoN link of the `existing` entry it replaces, where it lacks them. */
export function carrySources(
  entries: readonly ContentEntry[],
  existing: readonly ContentEntry[],
): readonly ContentEntry[] {
  const replaced = new Map(existing.map((entry) => [contentKey(entry.pack, entry.slug), entry]));
  return entries.map((entry) => {
    const before = replaced.get(contentKey(entry.pack, entry.slug));
    if (before === undefined) {
      return entry;
    }
    const previous = bookSources(before);
    return { ...entry, sources: entry.sources.map((source) => located(source, previous)) };
  });
}
