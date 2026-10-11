/**
 * Writes pack output (`pack-writes.ts` says where): replaces the target pack's entry files and what its earlier runs
 * added to `core-rules`, writes the backlog beside the pin, and formats every file with oxfmt so a re-run is a clean
 * diff. The catalog loads pack files through static imports in `json-packs.ts`, which the import cannot add, so it
 * names the files to register there and the imports left pointing at files it removed.
 */
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { ImportFile, packFiles } from '@pioneer/interop/foundry';
import type { ImportPin, PackOutput } from '@pioneer/interop/foundry';
import { ContentEntryFile } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { backlogPath, importedDirectory, missing, PACKS_DIRECTORY, packWrites, unregistered } from './pack-writes.ts';
import type { PackTargets, PackWrite } from './pack-writes.ts';

const ROOT = path.resolve(import.meta.dir, '../..');
const CATALOG = 'libs/rules/catalog/src/json-packs.ts';
const MANIFEST = 'pack.json';
const JSON_INDENT = 2;

/** The files below `directory` (relative to the root) matching `pattern`, as root-relative paths; none if it is absent. */
async function scan(pattern: string, directory: string): Promise<readonly string[]> {
  const cwd = path.join(ROOT, directory);
  const present = await stat(cwd).then(
    (stats) => stats.isDirectory(),
    () => false,
  );
  const found = present ? await Array.fromAsync(new Glob(pattern).scan({ cwd, onlyFiles: true })) : [];
  return found.map((file) => path.posix.join(directory, file.split(path.sep).join('/')));
}

/** The ids of what this pack's earlier runs added to the vocabulary pack, which this run replaces. */
export async function previousImport(targets: PackTargets): Promise<ReadonlySet<ContentId>> {
  const files = await scan('*.json', importedDirectory(targets));
  const entries = await Promise.all(
    files.map(async (file) => ContentEntryFile.parse(await Bun.file(path.join(ROOT, file)).json())),
  );
  return new Set(entries.flat().map(({ id }) => id));
}

/** The entries committed in the target pack, which this run replaces; its page numbers and AoN links carry over. */
export async function committedEntries({ pack }: PackTargets): Promise<readonly ContentEntry[]> {
  const files = await scan('*.json', path.posix.join(PACKS_DIRECTORY, pack));
  const entryFiles = files.filter((file) => path.posix.basename(file) !== MANIFEST);
  const entries = await Promise.all(
    entryFiles.map(async (file) => ContentEntryFile.parse(await Bun.file(path.join(ROOT, file)).json())),
  );
  return entries.flat();
}

async function removeReplaced(targets: PackTargets): Promise<void> {
  const directory = path.posix.join(PACKS_DIRECTORY, targets.pack);
  const manifest = await Bun.file(path.join(ROOT, directory, MANIFEST)).exists();
  if (!manifest) {
    throw new Error(`${directory}/${MANIFEST} is missing; commit the pack's manifest first`);
  }
  const packFileNames = await scan('*.json', directory);
  const entryFiles = packFileNames.filter((file) => path.posix.basename(file) !== MANIFEST);
  await Promise.all(entryFiles.map(async (file) => rm(path.join(ROOT, file))));
  await rm(path.join(ROOT, importedDirectory(targets)), { recursive: true, force: true });
}

async function write({ path: file, json }: PackWrite): Promise<void> {
  await mkdir(path.dirname(path.join(ROOT, file)), { recursive: true });
  await Bun.write(path.join(ROOT, file), `${JSON.stringify(json, undefined, JSON_INDENT)}\n`);
}

async function format(files: readonly string[]): Promise<void> {
  const formatter = Bun.spawn(['node_modules/.bin/oxfmt', ...files], { cwd: ROOT });
  const exited = await formatter.exited;
  if (exited !== 0) {
    throw new Error(`oxfmt exited with ${exited}`);
  }
}

/** Replaces the import's files with `output`, and returns the paths written. */
export async function writeOutput(
  output: PackOutput,
  targets: PackTargets,
  pin: ImportPin,
): Promise<readonly string[]> {
  const backlog = { path: backlogPath(targets.pack), json: ImportFile.parse({ pin, backlog: output.backlog }) };
  const writes = [...packWrites(packFiles(output.entries), targets), backlog];
  await removeReplaced(targets);
  await Promise.all(writes.map(async (each) => write(each)));
  const written = writes.map(({ path: file }) => file);
  await format(written);
  return written;
}

/** What to change in `json-packs.ts` so the catalog loads exactly the pack files now committed. */
export async function registrationReport(): Promise<string> {
  const catalog = await Bun.file(path.join(ROOT, CATALOG)).text();
  const scanned = await scan('*/**/*.json', PACKS_DIRECTORY);
  const files = scanned.toSorted();
  const toAdd = unregistered(catalog, files);
  const toRemove = missing(catalog, files);
  return [
    ...(toAdd.length > 0 ? [`Import these in ${CATALOG}:`, ...toAdd.map((file) => `  ${file}`)] : []),
    ...(toRemove.length > 0 ? [`Remove these imports from ${CATALOG}:`, ...toRemove.map((each) => `  ${each}`)] : []),
  ].join('\n');
}
