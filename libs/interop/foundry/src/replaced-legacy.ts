import { SourceKind } from '@pioneer/rules/sdk';
import type { AonUrl, BookId, ContentEntry, SourceRef } from '@pioneer/rules/sdk';

import type { FoundryPublication } from './foundry-document';
import { slugify } from './foundry-slug';

/**
 * The legacy entries a remaster entry replaces, by book and Foundry slug (ADR-0077). AoN's `remaster_id` (read by
 * `just aon-pages`) says which entry is replaced; only its name and URL are used, to pick the Foundry document and to
 * link it. Rules text comes from Foundry. The URL is absent when two replaced entries of a book share a slug (a feat
 * and a spell of one name), since the slug cannot tell which one the document is.
 */
export type ReplacedLegacy = ReadonlyMap<BookId, ReadonlyMap<string, AonUrl | undefined>>;

/** No replaced entries: every legacy document is left out, as before. */
export const NO_REPLACED: ReplacedLegacy = new Map();

/** What `content/aon` says of one book: the URLs of its replaced legacy entries and the names it lists by URL. */
export interface BookReplacements {
  readonly book: BookId;
  readonly replaced: readonly AonUrl[];
  readonly names: ReadonlyMap<AonUrl, string>;
}

/** The URL of each slug among `urls`, or none for a slug more than one URL names. */
function urlsBySlug(
  urls: readonly AonUrl[],
  names: ReadonlyMap<AonUrl, string>,
): ReadonlyMap<string, AonUrl | undefined> {
  const found = new Map<string, AonUrl | undefined>();
  for (const url of urls) {
    const name = names.get(url);
    if (name !== undefined) {
      const slug = slugify(name);
      found.set(slug, found.has(slug) ? undefined : url);
    }
  }
  return found;
}

/** The replaced entries of each book; one whose name AoN does not list is left out. */
export function replacedLegacy(books: readonly BookReplacements[]): ReplacedLegacy {
  return new Map(books.map(({ book, replaced, names }) => [book, urlsBySlug(replaced, names)]));
}

/** Whether the document is a pre-remaster one in `book` that a remaster entry replaces, and Foundry marks it OGL. */
export function isReplacedLegacy(
  replaced: ReplacedLegacy,
  publication: FoundryPublication,
  { book, slug }: { readonly book: BookId | undefined; readonly slug: string | undefined },
): boolean {
  return !publication.remaster && book !== undefined && slug !== undefined && (replaced.get(book)?.has(slug) ?? false);
}

/** `kind:slug` as the plain Foundry slug. */
function plainSlug(slug: string): string {
  return slug.slice(slug.indexOf(':') + 1);
}

function linked(source: SourceRef, entry: ContentEntry, replaced: ReplacedLegacy): SourceRef {
  if (source.kind !== SourceKind.Book || source.aon !== undefined) {
    return source;
  }
  const aon = replaced.get(source.book)?.get(plainSlug(entry.slug));
  return aon === undefined ? source : { ...source, aon };
}

/** `entries`, each book source of a replaced entry with the AoN link of the legacy entry it is, where it lacks one. */
export function withLegacyLinks(entries: readonly ContentEntry[], replaced: ReplacedLegacy): readonly ContentEntry[] {
  return entries.map((entry) => ({
    ...entry,
    sources: entry.sources.map((source) => linked(source, entry, replaced)),
  }));
}
