import * as z from 'zod';

import { FoundryDocument } from './foundry-document';

/**
 * A foundryvtt/pf2e source archive, read: the documents of its item packs and its English lang table. The CLI
 * extracts the files matching `RELEASE_FILES` and passes their text in; this module never touches the archive.
 */

/** Archive members the importer reads, below the archive's top-level directory. */
export const RELEASE_FILES = ['*/system.pf2e.json', '*/static/lang/en.json', '*/packs/pf2e/**/*.json'] as const;

const MANIFEST = 'system.pf2e.json';
const LANG = 'static/lang/en.json';
const PACK_SOURCES = 'packs/pf2e/';
/** Foundry's folder tree for a pack, not a document. */
const FOLDERS = '_folders.json';
const NAME_MAX = 200;
const PACKS_MAX = 1000;

const ManifestPack = z.looseObject({
  name: z.string().min(1).max(NAME_MAX),
  path: z.string().min(1).max(NAME_MAX),
  type: z.string().max(NAME_MAX),
});

/** The pack list of `system.pf2e.json`. A pack's `name` is its compendium name; its `path` ends in its source directory. */
const Manifest = z.looseObject({ packs: z.array(ManifestPack).max(PACKS_MAX) });

/** Foundry's `static/lang/en.json`: nested label tables, read by the i18n label story. */
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

/** A pack source file that is not valid JSON or lacks a field the importer reads. */
export interface UnreadableDocument {
  readonly pack: FoundryPack;
  readonly path: string;
  readonly error: string;
}

export interface FoundryRelease {
  readonly documents: readonly PackDocument[];
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

/** Item packs by source directory. */
function itemPacks(files: ReadonlyMap<string, string>): ReadonlyMap<string, FoundryPack> {
  const manifest = Manifest.parse(JSON.parse(required(files, MANIFEST)));
  return new Map(
    manifest.packs
      .filter((pack) => pack.type === 'Item')
      .map((pack) => {
        const directory = pack.path.slice(pack.path.lastIndexOf('/') + 1);
        return [directory, { name: pack.name, directory }];
      }),
  );
}

function packOf(packs: ReadonlyMap<string, FoundryPack>, path: string): FoundryPack | undefined {
  if (!path.startsWith(PACK_SOURCES) || path.endsWith(`/${FOLDERS}`)) {
    return undefined;
  }
  return packs.get(path.slice(PACK_SOURCES.length).split('/')[0] ?? '');
}

/**
 * Reads the item packs and lang table out of an archive's files, keyed by their archive path (top-level
 * directory included). Packs of other document types (actors, journals, macros, tables) are not read.
 */
export function readFoundryRelease(archiveFiles: ReadonlyMap<string, string>): FoundryRelease {
  const files = new Map([...archiveFiles].map(([path, text]) => [withoutRoot(path), text]));
  const packs = itemPacks(files);
  const reads = [...files]
    .toSorted(([left], [right]) => left.localeCompare(right))
    .flatMap(([path, text]) => {
      const pack = packOf(packs, path);
      return pack === undefined ? [] : [readDocument(pack, path, text)];
    });
  return {
    documents: reads.filter((read) => 'document' in read),
    unreadable: reads.filter((read) => 'error' in read),
    lang: FoundryLang.parse(JSON.parse(required(files, LANG))),
  };
}
