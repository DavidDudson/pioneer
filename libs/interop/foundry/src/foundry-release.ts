import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CONFIG_MODULES } from './foundry-config';
import { FoundryActor, FoundryDocument } from './foundry-document';
import { FoundryJournal } from './foundry-journal';
import { mergeLang } from './foundry-lang';

/**
 * A foundryvtt/pf2e source archive, read: the documents of its item and actor packs, its journals, and its English lang tables. The CLI
 * extracts the files matching `RELEASE_FILES` and passes their text in; this module never touches the archive. The
 * config modules among them are the CLI's to load (`foundry-config.ts`).
 */

/** Archive members the importer reads, below the archive's top-level directory. */
export const RELEASE_FILES: readonly string[] = [
  '*/system.pf2e.json',
  '*/static/system.json',
  '*/static/lang/*.json',
  '*/packs/**/*.json',
  ...Object.values(CONFIG_MODULES).map((module) => `*/${module}`),
];

/** The manifest of a release from 6.0 on, and of one before it (ADR-0077). */
const MANIFEST = 'system.pf2e.json';
const MANIFEST_BEFORE_6 = 'static/system.json';
/** Where the manifest's language paths (`lang/en.json`) live in the source tree. */
const LANG_ROOT = 'static/';
const ENGLISH = 'en';
const LANGUAGES_MAX = 50;
/** Where the pack sources are: below `packs/pf2e/` from 6.0 on, directly below `packs/` before it. */
const PACK_SOURCES = 'packs/pf2e/';
const PACK_SOURCES_BEFORE_6 = 'packs/';
/** Foundry's folder tree for a pack, not a document. */
const FOLDERS = '_folders.json';
const NAME_MAX = 200;
const PACKS_MAX = 1000;

const ManifestPack = z.looseObject({
  name: z.string().min(1).max(NAME_MAX),
  path: z.string().min(1).max(NAME_MAX),
  type: z.string().max(NAME_MAX),
});

const ManifestLanguage = z.looseObject({
  lang: z.string().max(NAME_MAX),
  path: z.string().min(1).max(NAME_MAX),
});

/**
 * The pack and language lists of `system.pf2e.json`. A pack's `name` is its compendium name; its `path` ends in its
 * source directory. A language lists each lang file Foundry merges, in order.
 */
const Manifest = z.looseObject({
  packs: z.array(ManifestPack).max(PACKS_MAX),
  languages: z.array(ManifestLanguage).max(LANGUAGES_MAX),
});
type Manifest = z.infer<typeof Manifest>;

/** A Foundry lang table: nested label tables, keyed by the parts of a lang key (`PF2E.TraitFire`). */
export const FoundryLang = z.record(z.string(), z.unknown());
export type FoundryLang = z.infer<typeof FoundryLang>;

/** An item pack, by its compendium name (`feats-srd`, used in compendium UUIDs) and source directory (`feats`). */
export interface FoundryPack {
  readonly name: string;
  readonly directory: string;
}

export interface PackDocument {
  readonly pack: FoundryPack;
  /** Path below the archive's top-level directory. */
  readonly path: string;
  readonly document: FoundryDocument;
}

/** An actor of an actor pack (a creature, a hazard), by the same path. */
export interface ActorDocument {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly actor: FoundryActor;
}

/** A journal of a journal pack (the archetypes journal), by the same path. */
export interface JournalDocument {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly journal: FoundryJournal;
}

/** A pack source file that is not valid JSON or lacks a field the importer reads. */
export interface UnreadableDocument {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly error: string;
}

export interface FoundryRelease {
  readonly documents: readonly PackDocument[];
  readonly journals: readonly JournalDocument[];
  readonly actors: readonly ActorDocument[];
  readonly unreadable: readonly UnreadableDocument[];
  readonly lang: FoundryLang;
}

/** `pf2e-pf2e-8.6.0/packs/pf2e/feats/x.json` to `packs/pf2e/feats/x.json`. */
function withoutRoot(path: string): string {
  return path.slice(path.indexOf('/') + 1);
}

function required(files: ReadonlyMap<string, string>, path: string): string {
  const text = files.get(path);
  if (text === undefined) {
    throw new Error(`The archive has no ${path}`);
  }
  return text;
}

function readDocument(pack: FoundryPack, path: string, text: string): PackDocument | UnreadableDocument {
  try {
    const document = FoundryDocument.safeParse(JSON.parse(text));
    return document.success
      ? { pack, path, document: document.data }
      : { pack, path, error: z.prettifyError(document.error) };
  } catch (error) {
    return { pack, path, error: String(error) };
  }
}

function readActor(pack: FoundryPack, path: string, text: string): ActorDocument | UnreadableDocument {
  try {
    const actor = FoundryActor.safeParse(JSON.parse(text));
    return actor.success ? { pack, path, actor: actor.data } : { pack, path, error: z.prettifyError(actor.error) };
  } catch (error) {
    return { pack, path, error: String(error) };
  }
}

function readJournal(pack: FoundryPack, path: string, text: string): JournalDocument | UnreadableDocument {
  try {
    const journal = FoundryJournal.safeParse(JSON.parse(text));
    return journal.success
      ? { pack, path, journal: journal.data }
      : { pack, path, error: z.prettifyError(journal.error) };
  } catch (error) {
    return { pack, path, error: String(error) };
  }
}

/** Foundry's pack types the importer reads. */
const PackType = { Item: 'Item', Journal: 'JournalEntry', Actor: 'Actor' } as const;
type PackType = ValueOf<typeof PackType>;

/** Packs of `type` by source directory. */
function packsOf(manifest: Manifest, type: PackType): ReadonlyMap<string, FoundryPack> {
  return new Map(
    manifest.packs
      .filter((pack) => pack.type === type)
      .map((pack) => {
        const directory = pack.path.slice(pack.path.lastIndexOf('/') + 1);
        return [directory, { name: pack.name, directory }];
      }),
  );
}

function packOf(packs: ReadonlyMap<string, FoundryPack>, path: string, sources: string): FoundryPack | undefined {
  if (!path.startsWith(sources) || path.endsWith(`/${FOLDERS}`)) {
    return undefined;
  }
  return packs.get(path.slice(sources.length).split('/')[0] ?? '');
}

/** Foundry's English lang tables, merged in the manifest's order. */
function englishLang(files: ReadonlyMap<string, string>, manifest: Manifest): FoundryLang {
  return mergeLang(
    manifest.languages
      .filter(({ lang }) => lang === ENGLISH)
      .map(({ path }) => FoundryLang.parse(JSON.parse(required(files, `${LANG_ROOT}${path}`)))),
  );
}

/**
 * Reads the item and actor packs, journals and lang table out of an archive's files, keyed by their archive path
 * (top-level directory included). Packs of other document types (macros, tables) are not read.
 */
export function readFoundryRelease(archiveFiles: ReadonlyMap<string, string>): FoundryRelease {
  const files = new Map([...archiveFiles].map(([path, text]) => [withoutRoot(path), text]));
  const before6 = !files.has(MANIFEST) && files.has(MANIFEST_BEFORE_6);
  const sources = before6 ? PACK_SOURCES_BEFORE_6 : PACK_SOURCES;
  const manifestText = required(files, before6 ? MANIFEST_BEFORE_6 : MANIFEST);
  const manifest = Manifest.parse(JSON.parse(manifestText));
  const items = packsOf(manifest, PackType.Item);
  const journals = packsOf(manifest, PackType.Journal);
  const actors = packsOf(manifest, PackType.Actor);
  const reads = [...files]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .flatMap(([path, text]): (PackDocument | JournalDocument | ActorDocument | UnreadableDocument)[] => {
      const itemPack = packOf(items, path, sources);
      const journalPack = packOf(journals, path, sources);
      const actorPack = packOf(actors, path, sources);
      if (itemPack !== undefined) {
        return [readDocument(itemPack, path, text)];
      }
      if (actorPack !== undefined) {
        return [readActor(actorPack, path, text)];
      }
      return journalPack === undefined ? [] : [readJournal(journalPack, path, text)];
    });
  return {
    documents: reads.filter((read) => 'document' in read),
    journals: reads.filter((read) => 'journal' in read),
    actors: reads.filter((read) => 'actor' in read),
    unreadable: reads.filter((read) => 'error' in read),
    lang: englishLang(files, manifest),
  };
}
