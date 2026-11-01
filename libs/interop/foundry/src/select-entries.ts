import { ContentLicense, CreatureRole } from '@pioneer/rules/sdk';
import type { Book, BookId } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { FOUNDRY_BOOK_TITLES } from './foundry-book-titles';
import { FoundryActorType, isFoundryItemType } from './foundry-document';
import type { FoundryItemType, FoundryPublication } from './foundry-document';
import type { ActorDocument, FoundryPack, FoundryRelease, PackDocument } from './foundry-release';
import { foundrySlug } from './foundry-slug';
import { legacyBooks } from './legacy-books';
import type { LegacyBooks } from './legacy-books';
import { isOglEntry } from './ogl-entries';
import type { LicenseField } from './ogl-entries';
import { isReplacedLegacy, NO_REPLACED } from './replaced-legacy';
import type { ReplacedLegacy } from './replaced-legacy';

/**
 * Foundry slugs of documents Pioneer replaces with an entry of its own: `effect-aquatic-combat` is the underwater
 * environment (Player Core page 437), whose adjustments and restrictions it would double-count.
 */
const SUPERSEDED_SLUGS: ReadonlySet<string> = new Set(['effect-aquatic-combat']);

/** Why a document in an item pack is not imported, in the order selection checks. */
export const SkipReason = {
  /** Not valid JSON, or a field selection reads is missing or malformed. */
  Unreadable: 'unreadable',
  /** A Foundry item or actor type with no Pioneer kind. */
  UnsupportedType: 'unsupported-type',
  /** A hazard actor: a later kind, left out of the creatures. */
  Hazard: 'hazard',
  /** `publication.remaster` is not `true`. */
  Legacy: 'legacy',
  /** A remaster entry under a licence other than ORC, the only one that allows rules text in packs (NOTICE.md). */
  NotOrc: 'not-orc',
  /** No publication, or a title missing from `FOUNDRY_BOOK_TITLES`. */
  UnknownBook: 'unknown-book',
  /** A registered book this run does not target. */
  NotTargeted: 'not-targeted',
  /** A document a committed Pioneer entry replaces, so importing it as well would apply the same rules twice. */
  Superseded: 'superseded',
} as const;
export type SkipReason = ValueOf<typeof SkipReason>;

export interface SelectedEntry extends PackDocument {
  readonly type: FoundryItemType;
  readonly book: BookId;
  /** Set for an item under the Open Game License in an ORC book (`OGL_ENTRIES`). */
  readonly license?: ContentLicense;
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

/** The books a run targets, and which of the pre-remaster ones the registry flags for import. */
interface Scope {
  readonly targets: ReadonlySet<BookId>;
  readonly legacy: LegacyBooks;
  /** The legacy entries a remaster entry replaces, which are taken from a legacy book (ADR-0077). */
  readonly replaced: ReplacedLegacy;
}

interface Printed {
  readonly book: BookId;
  readonly slug: string;
}

interface Skip {
  readonly reason: SkipReason;
  readonly detail: string;
}

/** `license: OGL` for a listed item in an ORC book; nothing for every other entry. */
function entryLicense(
  publication: FoundryPublication | undefined,
  { book, slug }: Printed,
  legacy: LegacyBooks,
): LicenseField {
  const licensed =
    publication !== undefined &&
    isOglEntry(publication, book, slug) &&
    !legacy.whole.has(book) &&
    !legacy.listed.has(book);
  return licensed ? { license: ContentLicense.Ogl } : {};
}

/** The target book an entry's publication names, or why it has none; `slug` is the Foundry slug of an item. */
function targetBook(
  publication: FoundryPublication | undefined,
  { targets, legacy, replaced }: Scope,
  slug?: string,
): BookId | Skip {
  if (publication === undefined) {
    return { reason: SkipReason.UnknownBook, detail: '' };
  }
  const book = FOUNDRY_BOOK_TITLES.get(publication.title);
  const ogl =
    (book !== undefined && legacy.whole.has(book)) ||
    isOglEntry(publication, book, slug) ||
    (book !== undefined &&
      (legacy.listed.has(book) || legacy.whole.has(book)) &&
      isReplacedLegacy(replaced, publication, { book, slug }));
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

function select(entry: PackDocument, scope: Scope): SelectedEntry | SkippedEntry {
  const { pack, path, document } = entry;
  const { type } = document;
  if (!isFoundryItemType(type)) {
    return { pack, path, reason: SkipReason.UnsupportedType, detail: type };
  }
  const slug = foundrySlug(document);
  const book = targetBook(document.system.publication, scope, slug);
  if (typeof book !== 'string') {
    return { pack, path, ...book };
  }
  if (SUPERSEDED_SLUGS.has(slug)) {
    return { pack, path, reason: SkipReason.Superseded, detail: slug };
  }
  return { ...entry, type, book, ...entryLicense(document.system.publication, { book, slug }, scope.legacy) };
}

/** Keeps remaster entries of supported types from the target books; reports every other document and why. */
export function selectEntries(
  release: FoundryRelease,
  targets: ReadonlySet<BookId>,
  books: readonly Book[],
): Selection {
  return selectIn(release, { targets, legacy: legacyBooks(books), replaced: NO_REPLACED });
}

/** What `selectReplacedLegacy` reads besides the release. */
export interface ReplacedScope {
  readonly targets: ReadonlySet<BookId>;
  readonly books: readonly Book[];
  readonly replaced: ReplacedLegacy;
}

/**
 * As `selectEntries`, and also keeps the pre-remaster documents that `replaced` names, from the target books the
 * registry flags legacy (ADR-0077). A release that predates the remaster is read this way.
 */
export function selectReplacedLegacy(release: FoundryRelease, { targets, books, replaced }: ReplacedScope): Selection {
  return selectIn(release, { targets, legacy: legacyBooks(books), replaced });
}

function selectIn(release: FoundryRelease, scope: Scope): Selection {
  const selected: SelectedEntry[] = [];
  const skipped: SkippedEntry[] = release.unreadable.map(({ pack, path, error }) => ({
    pack,
    path,
    reason: SkipReason.Unreadable,
    detail: error,
  }));
  for (const entry of release.documents) {
    const selection = select(entry, scope);
    if ('reason' in selection) {
      skipped.push(selection);
    } else {
      selected.push(selection);
    }
  }
  return { selected, skipped };
}

/** The actor packs that hold NPCs rather than monsters; every other bestiary pack holds monsters. */
const NPC_PACKS: ReadonlySet<string> = new Set(['pathfinder-npc-core', 'npc-gallery']);

/** Whether a bestiary pack, by its source directory, holds NPCs rather than monsters. */
export function creatureRole(directory: string): CreatureRole {
  return NPC_PACKS.has(directory) ? CreatureRole.Npc : CreatureRole.Monster;
}

/** A creature to import: an `npc` actor of a target book, with the role its pack gives it. */
export interface SelectedCreature extends ActorDocument {
  readonly book: BookId;
  readonly role: CreatureRole;
}

export interface CreatureSelection {
  readonly selected: readonly SelectedCreature[];
  readonly skipped: readonly SkippedEntry[];
}

function selectCreature(entry: ActorDocument, scope: Scope): SelectedCreature | SkippedEntry {
  const { pack, path, actor } = entry;
  if (actor.type === FoundryActorType.Hazard) {
    return { pack, path, reason: SkipReason.Hazard, detail: actor.type };
  }
  if (actor.type !== FoundryActorType.Npc) {
    return { pack, path, reason: SkipReason.UnsupportedType, detail: actor.type };
  }
  const book = targetBook(actor.system.details.publication, scope);
  if (typeof book !== 'string') {
    return { pack, path, ...book };
  }
  return { ...entry, book, role: creatureRole(pack.directory) };
}

/**
 * Keeps the `npc` actors of the target books under the same publication, remaster and licence rules as items, and
 * reports every other actor and why. Hazards are skipped under their own reason; an unreadable actor file, as for
 * items, is reported by `selectEntries`.
 */
export function selectCreatures(
  release: FoundryRelease,
  targets: ReadonlySet<BookId>,
  books: readonly Book[],
): CreatureSelection {
  const scope: Scope = { targets, legacy: legacyBooks(books), replaced: NO_REPLACED };
  const selected: SelectedCreature[] = [];
  const skipped: SkippedEntry[] = [];
  for (const entry of release.actors) {
    const selection = selectCreature(entry, scope);
    if ('reason' in selection) {
      skipped.push(selection);
    } else {
      selected.push(selection);
    }
  }
  return { selected, skipped };
}
