/**
 * Where pack output goes (ADR-0031, ADR-0033): the target pack's entries in `content/packs/<pack>/<kind>.json`,
 * overwriting the entry files it writes and leaving any other file there (a hand-made one) alone; the vocabulary it adds to `core-rules` in
 * `content/packs/core-rules/imported/<pack>/<kind>.json`, beside and never into the hand-authored files; and its
 * backlog in `content/import/<pack>.json`, beside its pin. Paths are relative to the repository root.
 */
import path from 'node:path';

import type { PackId } from '@pioneer/rules/sdk';

export const PACKS_DIRECTORY = 'content/packs';
export const IMPORT_DIRECTORY = 'content/import';
/** The directory below a vocabulary pack that holds what each import added to it. */
const IMPORTED = 'imported';

export interface PackTargets {
  readonly pack: PackId;
  readonly vocabularyPack: PackId;
}

export interface PackWrite {
  readonly path: string;
  readonly json: unknown;
}

/** The directory the import replaces whole in the vocabulary pack: what this pack's earlier runs added. */
export function importedDirectory({ pack, vocabularyPack }: PackTargets): string {
  return path.posix.join(PACKS_DIRECTORY, vocabularyPack, IMPORTED, pack);
}

export function backlogPath(pack: PackId): string {
  return path.posix.join(IMPORT_DIRECTORY, `${pack}.json`);
}

/** `content/packs/…` as `json-packs.js` imports it: `@pioneer/content/packs/…`. */
function specifier(file: string): string {
  return `@pioneer/content/${path.posix.relative('content', file)}`;
}

/** The pack files `json-packs.js` (its source, `catalog`) does not import, so the catalog would never load them. */
export function unregistered(catalog: string, files: readonly string[]): readonly string[] {
  return files.filter((file) => !catalog.includes(`'${specifier(file)}'`));
}

/** What `json-packs.js` imports from `content/packs` that is not among `files`, so its build would fail. */
export function missing(catalog: string, files: readonly string[]): readonly string[] {
  const present = new Set(files.map((file) => specifier(file)));
  const imported = [...catalog.matchAll(/'(?<specifier>@pioneer\/content\/packs\/[^']+\.json)'/gu)].map(
    ({ groups }) => groups?.['specifier'] ?? '',
  );
  return imported.filter((each) => !present.has(each));
}
