/**
 * Takes the rules a re-run of the import gives into the committed pack (`apply-rules.ts`), writes the backlog beside the
 * pin, and formats every file with bun fmt so a re-run is a clean diff. A committed pack is never replaced.
 */
import { mkdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { ImportFile } from '@pioneer/interop/foundry';
import type { PackOutput } from '@pioneer/interop/foundry';
import { ContentEntryFile } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { addOutcomesToText } from './apply-outcomes.ts';
import type { FreshDescriptions } from './apply-outcomes.ts';
import { clearAppliedGaps, gappedEntries, mergeRules, withMergedRules } from './apply-rules.ts';
import type { RulesMerge } from './apply-rules.ts';
import { addReports, NO_REPORT } from './outcomes-report.ts';
import type { OutcomesReport } from './outcomes-report.ts';
import { backlogPath, importedDirectory, PACKS_DIRECTORY } from './pack-writes.ts';
import type { PackTargets, PackWrite } from './pack-writes.ts';

const ROOT = path.resolve(import.meta.dir, '../..');
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
      const raw: unknown = await Bun.file(path.join(ROOT, file)).json();
      const entries = ContentEntryFile.parse(raw);
      const touched = entries.some(({ id }) => merge.has(id));
      return touched && Array.isArray(raw) ? [{ path: file, json: withMergedRules(raw, merge) }] : [];
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

/** The files `applyOutcomes` wrote, and what the merge did. */
export interface OutcomesOutput {
  readonly written: readonly string[];
  readonly report: OutcomesReport;
}

/** A committed file, its text once the outcomes are in, and what that did. */
interface FileMerge {
  readonly file: string;
  readonly text: string;
  readonly report: OutcomesReport;
}

/** The import's description of each entry, by id. */
function freshDescriptions(output: PackOutput): FreshDescriptions {
  return new Map(output.entries.map((entry) => [entry.id, entry.description]));
}

/** Each entry file of the target pack with the outcomes of `fresh` in its text. */
async function outcomeMerges(fresh: FreshDescriptions, targets: PackTargets): Promise<readonly FileMerge[]> {
  const directory = path.posix.join(PACKS_DIRECTORY, targets.pack);
  const scanned = await scan('*.json', directory);
  const files = scanned.filter((file) => path.posix.basename(file) !== MANIFEST);
  return Promise.all(
    files.map(async (file): Promise<FileMerge> => {
      const merge = addOutcomesToText(await Bun.file(path.join(ROOT, file)).text(), fresh);
      return { file, text: merge.text, report: merge.report };
    }),
  );
}

function totalReport(merges: readonly FileMerge[]): OutcomesReport {
  let report = NO_REPORT;
  for (const each of merges) {
    report = addReports(report, each.report);
  }
  return report;
}

/**
 * Adds the outcomes the import builds for each check to the committed descriptions (`apply-outcomes.ts`), in the files'
 * own text so nothing else in them moves, and formats the entry files that changed. The backlog stays as it is.
 */
export async function applyOutcomes(output: PackOutput, targets: PackTargets): Promise<OutcomesOutput> {
  const merged = await outcomeMerges(freshDescriptions(output), targets);
  const changed = merged.filter(({ report }) => report.added > 0);
  await Promise.all(changed.map(async ({ file, text }) => Bun.write(path.join(ROOT, file), text)));
  const written = changed.map(({ file }) => file);
  await format(written);
  return { written, report: totalReport(merged) };
}
