import type { Book, ContentLicense, SourceRef } from '@pioneer/rules/sdk';

/** A source of an entry as the list shows it: the citation, its book from the registry, and the entry's licence. */
export interface BrowseSource {
  readonly source: SourceRef;
  /** The book the source names, when the registry holds it. */
  readonly book: Book | undefined;
  /** The licence of the entry that cites the source, which makes OGL content in a remaster book legacy. */
  readonly license: ContentLicense;
}

/** A link to where a book is sold, named by the book's title message key. */
export interface StoreLink {
  readonly title: string;
  readonly url: string;
}
