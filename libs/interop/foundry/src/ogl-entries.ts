import { BookId, ContentLicense } from '@pioneer/rules/sdk';

import type { FoundryPublication } from './foundry-document';

/**
 * Open Game Content items that Foundry marks `OGL`, by Foundry slug and the book they are in: reprinted in an ORC
 * book, or printed only in a pre-remaster book (`LEGACY_ENTRY_BOOKS`). They are taken whole and are legacy; an item in
 * an ORC book is marked `license: OGL`, and the book's Section 15 notice is on the Legal page (NOTICE.md). Adding one is a licensing decision like adding to `OGL_BOOKS`.
 */
const OGL_ENTRIES: ReadonlyMap<string, BookId> = new Map([
  ...[
    'atlatl',
    'authorized',
    'buckle-armor',
    'purloining-cloak',
    'spraysling',
    'taw-launcher',
    'three-section-naginata',
  ].map((slug): [string, BookId] => [slug, BookId.parse('treasure-vault')]),
  ...[
    'chain-reaction',
    'repeating-crossbow',
    'repeating-crossbow-magazine',
    'repeating-heavy-crossbow',
    'repeating-heavy-crossbow-magazine',
    'unbelievable-luck',
    'unexpected-sharpshooter-dedication',
  ].map((slug): [string, BookId] => [slug, BookId.parse('guns-and-gears')]),
  ['vital-luminance', BookId.parse('core-rulebook')],
  ['eye-for-numbers', BookId.parse('advanced-players-guide')],
  ['quick-change', BookId.parse('advanced-players-guide')],
  ['verdant-sprout', BookId.parse('the-show-must-go-on')],
]);

/**
 * Pre-remaster books Pioneer registers only for their `OGL_ENTRIES`: their packs are OGL, so an entry in them needs
 * no `license` of its own, and nothing else in them is selected.
 */
export const LEGACY_ENTRY_BOOKS: ReadonlySet<BookId> = new Set([
  BookId.parse('core-rulebook'),
  BookId.parse('advanced-players-guide'),
  BookId.parse('the-show-must-go-on'),
]);

/** The licence field an entry carries when it is not its pack's. */
export interface LicenseField {
  readonly license?: ContentLicense;
}

/** Whether the document is one of `OGL_ENTRIES` in its book and Foundry marks it Open Game License. */
export function isOglEntry(
  publication: FoundryPublication,
  book: BookId | undefined,
  slug: string | undefined,
): boolean {
  return (
    slug !== undefined &&
    book !== undefined &&
    publication.license === ContentLicense.Ogl &&
    OGL_ENTRIES.get(slug) === book
  );
}
