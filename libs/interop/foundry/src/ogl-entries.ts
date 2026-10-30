import { BookId, ContentLicense } from '@pioneer/rules/sdk';

import type { FoundryPublication } from './foundry-document';

/**
 * Open Game Content items that the ORC book printing them still carries under the Open Game License, by Foundry
 * slug and the book they are in: reprinted, not new. They are taken whole and marked `license: OGL`, and the book's
 * Section 15 notice is on the Legal page (NOTICE.md). Adding one is a licensing decision like adding to `OGL_BOOKS`.
 */
const OGL_ENTRIES: ReadonlyMap<string, BookId> = new Map(
  [
    'atlatl',
    'authorized',
    'buckle-armor',
    'purloining-cloak',
    'spraysling',
    'taw-launcher',
    'three-section-naginata',
  ].map((slug) => [slug, BookId.parse('treasure-vault')]),
);

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
