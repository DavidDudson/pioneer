import { BookId, ContentLicense, CreatureRole } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

import { FoundryActorType, isFoundryItemType } from './foundry-document';
import type { FoundryItemType, FoundryPublication } from './foundry-document';
import type { ActorDocument, FoundryPack, FoundryRelease, PackDocument } from './foundry-release';

/**
 * Foundry's `publication.title` for each book in the registry. A title not here is a book Pioneer does not
 * register yet, and its entries are skipped as an unknown book.
 */
export const FOUNDRY_BOOK_TITLES: ReadonlyMap<string, BookId> = new Map([
  ['Pathfinder Player Core', BookId.parse('player-core')],
  ['Pathfinder Player Core 2', BookId.parse('player-core-2')],
  ['Pathfinder GM Core', BookId.parse('gm-core')],
  ['Pathfinder Monster Core', BookId.parse('monster-core')],
  ['Pathfinder Monster Core 2', BookId.parse('monster-core-2')],
  ['Pathfinder NPC Core', BookId.parse('npc-core')],
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
  ['Pathfinder Impossible Magic', BookId.parse('impossible-magic')],
  ['Pathfinder Guns & Gears', BookId.parse('guns-and-gears')],
  ['Pathfinder Battlecry!', BookId.parse('battlecry')],
  ['Pathfinder Lost Omens Cheliax, Infernal Inheritance', BookId.parse('cheliax-infernal-inheritance')],
  ['Pathfinder Lost Omens Rival Academies', BookId.parse('rival-academies')],
  ['Pathfinder Lost Omens Shining Kingdoms', BookId.parse('shining-kingdoms')],
  ['Pathfinder Lost Omens Draconic Codex', BookId.parse('draconic-codex')],
  ['Pathfinder Lost Omens Hellfire Dispatches', BookId.parse('hellfire-dispatches')],
  ['Pathfinder Lost Omens High Seas', BookId.parse('high-seas')],
  ['Pathfinder Season of Ghosts Hardcover Compilation', BookId.parse('season-of-ghosts')],
  ['Pathfinder Adventure Path: Hellbreakers', BookId.parse('hellbreakers')],
  ['Pathfinder Adventure Path: Gatewalkers', BookId.parse('gatewalkers')],
  ["Gatewalkers Player's Guide (Remastered)", BookId.parse('gatewalkers')],
  ["Pathfinder Gatewalkers Player's Guide", BookId.parse('gatewalkers')],
  ['Pathfinder #216: The Acropolis Pyre', BookId.parse('myth-speakers')],
  ['Pathfinder #217: Death Sails a Wine-Dark Sea', BookId.parse('myth-speakers')],
  ['Pathfinder #218: Titanbane', BookId.parse('myth-speakers')],
  ["Pathfinder Myth-Speaker Player's Guide", BookId.parse('myth-speakers')],
  ['Pathfinder #219: Lord of the Trinity Star', BookId.parse('revenge-of-the-runelords')],
  ['Pathfinder #220: Crypt of Runes', BookId.parse('revenge-of-the-runelords')],
  ['Pathfinder #221: Into the Apocalypse Archive', BookId.parse('revenge-of-the-runelords')],
  ["Pathfinder Revenge of the Runelords Player's Guide", BookId.parse('revenge-of-the-runelords')],
  ['Pathfinder Beginner Box: Secrets of the Unlit Star', BookId.parse('secrets-of-the-unlit-star')],
  ['Pathfinder Adventures: Troubles in Grayce', BookId.parse('troubles-in-grayce')],
  ["Pathfinder Adventure Path: Hell's Destiny", BookId.parse('hells-destiny')],
  ["Pathfinder #223: Hell's Destiny", BookId.parse('hells-destiny')],
  ["Pathfinder Hell's Destiny Player's Guide", BookId.parse('hells-destiny')],
  ['Pathfinder Adventure Path: Bastion of Blasphemies', BookId.parse('bastion-of-blasphemies')],
  ["Pathfinder Bastion of Blasphemies Player's Guide", BookId.parse('bastion-of-blasphemies')],
  ["The Dead God's Hand", BookId.parse('the-dead-gods-hand')],
  ["Pathfinder Hellbreakers Player's Guide", BookId.parse('hellbreakers')],
  ['Pathfinder #201: Pactbreaker', BookId.parse('wardens-of-wildwood')],
  ['Pathfinder #202: Severed at the Root', BookId.parse('wardens-of-wildwood')],
  ['Pathfinder #203: Shepherd of Decay', BookId.parse('wardens-of-wildwood')],
  ["Pathfinder Wardens of Wildwood Player's Guide", BookId.parse('wardens-of-wildwood')],
  ['Pathfinder #204: Stage Fright', BookId.parse('curtain-call')],
  ['Pathfinder #205: Singer, Stalker, Skinsaw Man', BookId.parse('curtain-call')],
  ['Pathfinder #206: Bring the House Down', BookId.parse('curtain-call')],
  ["Pathfinder Curtain Call Player's Guide", BookId.parse('curtain-call')],
  ['Pathfinder #207: The Resurrection Flood', BookId.parse('triumph-of-the-tusk')],
  ['Pathfinder #208: Hoof, Cinder, and Storm', BookId.parse('triumph-of-the-tusk')],
  ["Pathfinder #209: Destroyer's Doom", BookId.parse('triumph-of-the-tusk')],
  ["Pathfinder Triumph of The Tusk Player's Guide", BookId.parse('triumph-of-the-tusk')],
  ['Pathfinder #210: Whispers in the Dirt', BookId.parse('spore-war')],
  ['Pathfinder #211: The Secret of Deathstalk Tower', BookId.parse('spore-war')],
  ['Pathfinder #212: A Voice in the Blight', BookId.parse('spore-war')],
  ["Pathfinder Spore War Player's Guide", BookId.parse('spore-war')],
  ['Pathfinder #213: Thirst for Blood', BookId.parse('shades-of-blood')],
  ['Pathfinder #214: The Broken Palace', BookId.parse('shades-of-blood')],
  ['Pathfinder #215: To Blot Out the Sun', BookId.parse('shades-of-blood')],
  ["Pathfinder Shades of Blood Player's Guide", BookId.parse('shades-of-blood')],
  ['Pathfinder Adventure: Prey for Death', BookId.parse('prey-for-death')],
  ['Pathfinder Claws of the Tyrant', BookId.parse('claws-of-the-tyrant')],
  ["Pathfinder Society Clockwork Mystery Player's Guide", BookId.parse('clockwork-mystery')],
  ['Pathfinder Lost Omens Tian Xia World Guide', BookId.parse('tian-xia-world-guide')],
  ['Paizo Blog: Foolish Housekeeping and Other Articles', BookId.parse('foolish-housekeeping')],
]);

/**
 * Pre-remaster books imported under the Open Game License, for content the remaster books still point at (Goloma,
 * which Pathbuilder exports name). Their entries are legacy and OGL, which selection otherwise skips. Adding a book
 * here is a licensing decision: NOTICE.md and the Legal page must carry its notice.
 */
const OGL_BOOKS: ReadonlySet<BookId> = new Set([
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

function selectCreature(entry: ActorDocument, targets: ReadonlySet<BookId>): SelectedCreature | SkippedEntry {
  const { pack, path, actor } = entry;
  if (actor.type === FoundryActorType.Hazard) {
    return { pack, path, reason: SkipReason.Hazard, detail: actor.type };
  }
  if (actor.type !== FoundryActorType.Npc) {
    return { pack, path, reason: SkipReason.UnsupportedType, detail: actor.type };
  }
  const book = targetBook(actor.system.details.publication, targets);
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
export function selectCreatures(release: FoundryRelease, targets: ReadonlySet<BookId>): CreatureSelection {
  const selected: SelectedCreature[] = [];
  const skipped: SkippedEntry[] = [];
  for (const entry of release.actors) {
    const selection = selectCreature(entry, targets);
    if ('reason' in selection) {
      skipped.push(selection);
    } else {
      selected.push(selection);
    }
  }
  return { selected, skipped };
}
