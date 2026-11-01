import type { AonUrl, BookId } from '@pioneer/rules/sdk';

import type { FoundryPublication } from './foundry-document';
import { slugify } from './foundry-slug';

/**
 * The Foundry slugs of the legacy entries a remaster entry replaces, by book (ADR-0077). AoN's `remaster_id` (read by
 * `just aon-pages`) says which entry is replaced; only its name is used, to pick the Foundry document. Rules text
 * comes from Foundry.
 */
export type ReplacedLegacy = ReadonlyMap<BookId, ReadonlySet<string>>;

/** No replaced entries: every legacy document is left out, as before. */
export const NO_REPLACED: ReplacedLegacy = new Map();

/** What `content/aon` says of one book: the URLs of its replaced legacy entries and the names it lists by URL. */
export interface BookReplacements {
  readonly book: BookId;
  readonly replaced: readonly AonUrl[];
  readonly names: ReadonlyMap<AonUrl, string>;
}

/** The slugs of the replaced entries of each book; a replaced entry whose name AoN does not list is left out. */
export function replacedLegacy(books: readonly BookReplacements[]): ReplacedLegacy {
  return new Map(
    books.map(({ book, replaced, names }) => [
      book,
      new Set(replaced.flatMap((url) => (names.has(url) ? [slugify(names.get(url) ?? '')] : []))),
    ]),
  );
}

/** Whether the document is a pre-remaster one in `book` that a remaster entry replaces, and Foundry marks it OGL. */
export function isReplacedLegacy(
  replaced: ReplacedLegacy,
  publication: FoundryPublication,
  { book, slug }: { readonly book: BookId | undefined; readonly slug: string | undefined },
): boolean {
  return !publication.remaster && book !== undefined && slug !== undefined && (replaced.get(book)?.has(slug) ?? false);
}
