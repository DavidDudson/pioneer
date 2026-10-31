/**
 * Writes pack output (`pack-writes.ts` says where): overwrites the target pack's entry files and replaces what its earlier runs
 * added to `core-rules`, writes the backlog beside the pin, and formats every file with bun fmt so a re-run is a clean
 * diff. The catalog loads pack files through static imports in `json-packs.js`, which the import cannot add, so it
 * names the files to register there and the imports left pointing at files it removed.
 */
import { mkdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

import { ImportFile, packFiles } from '@pioneer/interop/foundry';
import type { ImportPin, PackOutput } from '@pioneer/interop/foundry';
import { ContentEntryFile } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { clearAppliedGaps, gappedEntries, mergeRules, withMergedRules } from './apply-rules.ts';
import type { RulesMerge } from './apply-rules.ts';
import { backlogPath, importedDirectory, missing, PACKS_DIRECTORY, packWrites, unregistered } from './pack-writes.ts';
import type { PackTargets, PackWrite } from './pack-writes.ts';

const ROOT = path.resolve(import.meta.dir, '../..');
/** The directory of the files that import pack files for the catalog: `json-packs.js`, `ogl-packs.js`, `orc-packs.js`. */
const CATALOG_DIRECTORY = 'libs/rules/catalog/src';
const CATALOG_PATTERN = '*-packs.js';
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

/**
 * Clears what this pack's earlier runs added to the vocabulary pack. The target pack's entry files are overwritten
 * where the import writes them and left alone where it does not, so a hand-made file (`environment.json`) survives.
 */
async function removeReplaced(targets: PackTargets): Promise<void> {
  const directory = path.posix.join(PACKS_DIRECTORY, targets.pack);
  const manifest = await Bun.file(path.join(ROOT, directory, MANIFEST)).exists();
  if (!manifest) {
    throw new Error(`${directory}/${MANIFEST} is missing; commit the pack's manifest first`);
  }
  await rm(path.join(ROOT, importedDirectory(targets)), { recursive: true, force: true });
}

async function write({ path: file, json }: PackWrite): Promise<void> {
  await mkdir(path.dirname(path.join(ROOT, file)), { recursive: true });
  await Bun.write(path.join(ROOT, file), `${JSON.stringify(json, undefined, JSON_INDENT)}\n`);
}

async function format(files: readonly string[]): Promise<void> {
  const formatter = Bun.spawn(['bun', 'fmt', ...files], { cwd: ROOT });
  const exited = await formatter.exited;
  if (exited !== 0) {
    throw new Error(`bun fmt exited with ${exited}`);
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

/** What to change in the catalog files so they load exactly the pack files now committed. */
async function registrationReport(): Promise<string> {
  const catalogs = await scan(CATALOG_PATTERN, CATALOG_DIRECTORY);
  const sources = await Promise.all(catalogs.map(async (file) => Bun.file(path.join(ROOT, file)).text()));
  const catalog = sources.join('\n');
  const scanned = await scan('*/**/*.json', PACKS_DIRECTORY);
  const files = scanned.toSorted();
  const toAdd = unregistered(catalog, files);
  const toRemove = missing(catalog, files);
  const where = catalogs.join(' or ');
  return [
    ...(toAdd.length > 0 ? [`Import these in ${where}:`, ...toAdd.map((file) => `  ${file}`)] : []),
    ...(toRemove.length > 0 ? [`Remove these imports from ${where}:`, ...toRemove.map((each) => `  ${each}`)] : []),
  ].join('\n');
}

/**
 * The spelling `typos` (part of `lint:workspace`) finds in `files`, one per line; empty when there is none. Foundry's text
 * carries Paizo's own misspellings, which `_typos.toml` allowlists as imported, so the import names them rather than
 * leaving them to fail CI.
 */
async function spellingReport(files: readonly string[]): Promise<string> {
  const checker = Bun.spawn(['typos', '--format', 'brief', ...files], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  const [report, exited] = await Promise.all([new Response(checker.stdout).text(), checker.exited]);
  return exited === 0 ? '' : report.trim();
}

/** The pack's committed pin and backlog. */
async function committedBacklog({ pack }: PackTargets): Promise<ImportFile> {
  const json: unknown = await Bun.file(path.join(ROOT, backlogPath(pack))).json();
  return ImportFile.parse(json);
}

/** The files `applyRules` wrote, and how many entries gained rules. */
export interface AppliedOutput {
  readonly written: readonly string[];
  readonly applied: number;
}

/** The committed entry files of the target pack, with `merge`'s rules in the ones it touches. */
async function mergedEntryFiles(targets: PackTargets, merge: RulesMerge): Promise<readonly PackWrite[]> {
  const directory = path.posix.join(PACKS_DIRECTORY, targets.pack);
  const scanned = await scan('*.json', directory);
  const files = scanned.filter((file) => path.posix.basename(file) !== MANIFEST);
  const changed = await Promise.all(
    files.map(async (file) => {
      const entries = ContentEntryFile.parse(await Bun.file(path.join(ROOT, file)).json());
      const touched = entries.some(({ id }) => merge.has(id));
      return touched ? [{ path: file, json: withMergedRules(entries, merge) }] : [];
    }),
  );
  return changed.flat();
}

/** The gapped entries the import holds, whose gaps may be cleared. */
function importedGaps(output: PackOutput, gapped: ReadonlySet<string>): ReadonlySet<string> {
  const imported = new Set(output.entries.map(({ pack, slug }) => `${pack}/${slug}`));
  return new Set([...gapped].filter((entry) => imported.has(entry)));
}

/** Writes `writes`, formats them and returns their paths. */
async function writeAndFormat(writes: readonly PackWrite[]): Promise<readonly string[]> {
  await Promise.all(writes.map(async (each) => write(each)));
  const written = writes.map(({ path: file }) => file);
  await format(written);
  return written;
}

/**
 * Takes the import's rules of `keys` into the committed pack files (`apply-rules.ts`), clears their gaps from the
 * backlog and formats what changed.
 */
export async function applyRules(
  output: PackOutput,
  targets: PackTargets,
  keys: ReadonlySet<string>,
): Promise<AppliedOutput> {
  const { pin, backlog } = await committedBacklog(targets);
  const committed = await committedEntries(targets);
  const gapped = gappedEntries(backlog, keys);
  const merge = mergeRules(committed, output.entries, { gapped, keys });
  const merged = importedGaps(output, gapped);
  const remaining = clearAppliedGaps(backlog, output.backlog, { merged, keys });
  const cleared = { path: backlogPath(targets.pack), json: ImportFile.parse({ pin, backlog: remaining }) };
  const files = await mergedEntryFiles(targets, merge);
  const written = await writeAndFormat([...files, cleared]);
  return { written, applied: merge.size };
}

/** What is left to do after a write: the catalog registration and the spelling `lint:workspace` would fail on. */
export async function writeChecks(written: readonly string[]): Promise<string> {
  const registration = await registrationReport();
  const spelling = await spellingReport(written);
  return [
    registration === '' ? 'The catalog imports every pack file.' : registration,
    spelling === ''
      ? 'typos finds nothing in the written files.'
      : `typos finds these in the written files; fix them, or allowlist Paizo's own spelling in _typos.toml:\n${spelling}`,
  ].join('\n');
}
