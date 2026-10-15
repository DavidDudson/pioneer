import { BookId, ContentLicense } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { isFoundryItemType } from './foundry-document';
import type { FoundryItemType, FoundryPublication } from './foundry-document';
import type { FoundryPack, FoundryRelease, PackDocument } from './foundry-release';

/**
 * Foundry's `publication.title` for each book in the registry. A title not here is a book Pioneer does not
 * register yet, and its entries are skipped as an unknown book.
 */
export const FOUNDRY_BOOK_TITLES: ReadonlyMap<string, BookId> = new Map([
  ['Pathfinder Player Core', BookId.parse('player-core')],
  ['Pathfinder Player Core 2', BookId.parse('player-core-2')],
  ['Pathfinder GM Core', BookId.parse('gm-core')],
  ['Pathfinder Monster Core', BookId.parse('monster-core')],
  ['Pathfinder Lost Omens Divine Mysteries', BookId.parse('divine-mysteries')],
  // The book's free online supplement, filed under the book.
  ['Pathfinder Lost Omens Divine Mysteries Web Supplement', BookId.parse('divine-mysteries')],
  ['Pathfinder Treasure Vault (Remastered)', BookId.parse('treasure-vault')],
  // Two entries carry the title with a leading space, and 42 the pre-remaster title while flagged remaster.
  [' Pathfinder Treasure Vault (Remastered)', BookId.parse('treasure-vault')],
  ['Pathfinder Treasure Vault', BookId.parse('treasure-vault')],
  ['Pathfinder Howl of the Wild', BookId.parse('howl-of-the-wild')],
  ['Pathfinder War of Immortals', BookId.parse('war-of-immortals')],
  ['Pathfinder Lost Omens The Mwangi Expanse', BookId.parse('mwangi-expanse')],
  ['Pathfinder Secrets of Magic', BookId.parse('secrets-of-magic')],
  ['Pathfinder Rage of Elements', BookId.parse('rage-of-elements')],
  ['Pathfinder Lost Omens Impossible Lands', BookId.parse('impossible-lands')],
  ['Pathfinder Lost Omens Character Guide', BookId.parse('character-guide')],
  ['Pathfinder Dark Archive (Remastered)', BookId.parse('dark-archive-remastered')],
  ['Pathfinder Lost Omens Tian Xia Character Guide', BookId.parse('tian-xia-character-guide')],
]);

/**
 * Pre-remaster books imported under the Open Game License, for content the remaster books still point at (Goloma,
 * which Pathbuilder exports name). Their entries are legacy and OGL, which selection otherwise skips. Adding a book
 * here is a licensing decision: NOTICE.md and the Legal page must carry its notice.
 */
export const OGL_BOOKS: ReadonlySet<BookId> = new Set([
  BookId.parse('mwangi-expanse'),
  BookId.parse('secrets-of-magic'),
  BookId.parse('rage-of-elements'),
  BookId.parse('character-guide'),
  BookId.parse('impossible-lands'),
]);

/** Why a document in an item pack is not imported, in the order selection checks. */
export const SkipReason = {
  /** Not valid JSON, or a field selection reads is missing or malformed. */
  Unreadable: 'unreadable',
  /** A Foundry item type with no Pioneer kind. */
  UnsupportedType: 'unsupported-type',
  /** `publication.remaster` is not `true`. */
  Legacy: 'legacy',
  /** A remaster entry under a licence other than ORC, the only one that allows rules text in packs (NOTICE.md). */
  NotOrc: 'not-orc',
  /** No publication, or a title missing from `FOUNDRY_BOOK_TITLES`. */
  UnknownBook: 'unknown-book',
  /** A registered book this run does not target. */
  NotTargeted: 'not-targeted',
} as const;
export type SkipReason = ValueOf<typeof SkipReason>;

export interface SelectedEntry extends PackDocument {
  readonly type: FoundryItemType;
  readonly book: BookId;
}

export interface SkippedEntry {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly reason: SkipReason;
  /** What the reason is about: the Foundry type, the publication title or licence, the book, or the parse error. */
  readonly detail: string;
}

export interface Selection {
  readonly selected: readonly SelectedEntry[];
  readonly skipped: readonly SkippedEntry[];
}

interface Skip {
  readonly reason: SkipReason;
  readonly detail: string;
}

/** The target book an entry's publication names, or why it has none. */
function targetBook(publication: FoundryPublication | undefined, targets: ReadonlySet<BookId>): BookId | Skip {
  if (publication === undefined) {
    return { reason: SkipReason.UnknownBook, detail: '' };
  }
  const book = FOUNDRY_BOOK_TITLES.get(publication.title);
  const ogl = book !== undefined && OGL_BOOKS.has(book);
  if (!ogl && !publication.remaster) {
    return { reason: SkipReason.Legacy, detail: publication.title };
  }
  if (publication.license !== (ogl ? ContentLicense.Ogl : ContentLicense.Orc)) {
    return { reason: SkipReason.NotOrc, detail: publication.license ?? '' };
  }
  if (book === undefined) {
    return { reason: SkipReason.UnknownBook, detail: publication.title };
  }
  return targets.has(book) ? book : { reason: SkipReason.NotTargeted, detail: book };
}

function select(entry: PackDocument, targets: ReadonlySet<BookId>): SelectedEntry | SkippedEntry {
  const { pack, path, document } = entry;
  const { type } = document;
  if (!isFoundryItemType(type)) {
    return { pack, path, reason: SkipReason.UnsupportedType, detail: type };
  }
  const book = targetBook(document.system.publication, targets);
  return typeof book === 'string' ? { ...entry, type, book } : { pack, path, ...book };
}

/** Keeps remaster entries of supported types from the target books; reports every other document and why. */
export function selectEntries(release: FoundryRelease, targets: ReadonlySet<BookId>): Selection {
  const selected: SelectedEntry[] = [];
  const skipped: SkippedEntry[] = release.unreadable.map(({ pack, path, error }) => ({
    pack,
    path,
    reason: SkipReason.Unreadable,
    detail: error,
  }));
  for (const entry of release.documents) {
    const selection = select(entry, targets);
    if ('reason' in selection) {
      skipped.push(selection);
    } else {
      selected.push(selection);
    }
  }
  return { selected, skipped };
}
