import type { BrowseSource, StoreLink } from '@pioneer/content/ui';
import { bookRegistry } from '@pioneer/rules/books';
import { BOOK_TITLES, ContentLicense, effectiveLicense, SourceKind } from '@pioneer/rules/sdk';
import type { ContentEntry, PackId } from '@pioneer/rules/sdk';

/**
 * The sources of an entry for the badge: each with its book from the registry and the entry's licence, its own or its
 * pack's. A pack not held counts as homebrew, which is never legacy.
 */
export function browseSources(
  entry: ContentEntry,
  licenses: ReadonlyMap<PackId, ContentLicense>,
): readonly BrowseSource[] {
  const pack = licenses.get(entry.pack) ?? ContentLicense.Homebrew;
  const license = effectiveLicense(entry, { license: pack });
  return entry.sources.map((source) => ({
    source,
    book: source.kind === SourceKind.Book ? bookRegistry.book(source.book) : undefined,
    license,
  }));
}

/** Where the entry's books are sold: one link per book the Paizo Store lists, in the order the sources cite them. */
export function storeLinks(entry: ContentEntry): readonly StoreLink[] {
  const links = new Map<string, StoreLink>();
  for (const source of entry.sources) {
    const book = source.kind === SourceKind.Book ? bookRegistry.book(source.book) : undefined;
    const title = source.kind === SourceKind.Book ? BOOK_TITLES.get(source.book) : undefined;
    if (book?.storeUrl !== undefined && title !== undefined) {
      links.set(book.storeUrl, { title, url: book.storeUrl });
    }
  }
  return [...links.values()];
}
