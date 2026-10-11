import { contentKey, SourceKind } from '@pioneer/rules/sdk';
import type { BookId, ContentKey } from '@pioneer/rules/sdk';

import type { BookRegistry } from './book-registry';
import type { SourcedEntry } from './source-check';

/** How well one book's citations are filled in. */
export interface BookCoverage {
  readonly book: BookId;
  /** How many entries cite the book. */
  readonly cited: number;
  /** Entries citing the book with no page number, by AoN link alone or by the book alone; sorted. */
  readonly missingPage: readonly ContentKey[];
}

/** Whether `entry` cites `book` with no page. */
function lacksPage(entry: SourcedEntry, book: BookId): boolean {
  return entry.sources.some(
    (source) =>
      source.kind === SourceKind.Book && source.book === book && source.page === undefined,
  );
}

function cites(entry: SourcedEntry, book: BookId): boolean {
  return entry.sources.some((source) => source.kind === SourceKind.Book && source.book === book);
}

/**
 * Page coverage per registered book, in registry order (content-model.md, "Books and source references"). A report,
 * never a check: a book source may cite AoN, or the book alone, until its page is known.
 */
export function sourceCoverage(entries: readonly SourcedEntry[], registry: BookRegistry): readonly BookCoverage[] {
  return registry.books.map(({ id }) => ({
    book: id,
    cited: entries.filter((entry) => cites(entry, id)).length,
    missingPage: entries
      .filter((entry) => lacksPage(entry, id))
      .map((entry) => contentKey(entry.pack, entry.slug))
      .toSorted(),
  }));
}
