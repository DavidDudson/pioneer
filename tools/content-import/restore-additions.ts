import path from 'node:path';
import { parseArgs } from 'node:util';

/**
 * `just content-restore --pack <pack> [--ref HEAD] [--dry-run]`: after a re-import replaced `content/packs/<pack>/`,
 * puts back the hand additions the import cannot know about (ADR-0031: the committed pack is the source of truth).
 * Entries are matched by id against the files at `--ref`; `restore-merge.ts` says what comes back per field.
 *
 * The report names each restored entry and field; review it, because a field the import now translates better than
 * the ref is also overwritten by "ref wins".
 */
import { $ } from 'bun';

import { restore } from './restore-merge.ts';
import type { Entry, Restored } from './restore-merge.ts';

interface FileResult {
  readonly file: string;
  readonly report: readonly string[];
  readonly merged: readonly Entry[] | undefined;
}

const ROOT = path.resolve(import.meta.dir, '../..');

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function reportOf(file: string, committed: readonly Entry[], imported: ReadonlyMap<unknown, Restored>): string[] {
  const name = path.basename(file);
  return committed.flatMap((old) => {
    const restored = imported.get(old.id);
    if (restored === undefined) {
      return [`${name}  ${old.name}  NOT IN THE IMPORT (the ref had it)`];
    }
    return restored.fields.length > 0 ? [`${name}  ${old.name}  ${restored.fields.join(', ')}`] : [];
  });
}

/** Each committed entry the import also holds, restored, by id. */
function restoredBy(committed: readonly Entry[], imported: readonly Entry[]): ReadonlyMap<string, Restored> {
  const byId = new Map(imported.map((entry) => [entry.id, entry]));
  return new Map(
    committed.flatMap((old) => {
      const incoming = byId.get(old.id);
      return incoming === undefined ? [] : [[old.id, restore(old, incoming)] as const];
    }),
  );
}

async function restoreFile(file: string, ref: string): Promise<FileResult> {
  const target = Bun.file(path.join(ROOT, file));
  const fileExists = await target.exists();
  const refText = await $`git show ${ref}:${file}`.cwd(ROOT).text();
  const committed = JSON.parse(refText) as Entry[];
  if (!fileExists) {
    const report = [`${path.basename(file)}  WHOLE FILE (the import did not write it, the ref has it)`];
    return { file, report, merged: committed };
  }
  const imported = JSON.parse(await target.text()) as Entry[];
  const restored = restoredBy(committed, imported);
  const merged = imported.map((entry) => restored.get(entry.id)?.entry ?? entry);
  const changed = merged.some((entry, index) => !same(entry, imported[index]));
  return { file, report: reportOf(file, committed, restored), merged: changed ? merged : undefined };
}

interface Options {
  readonly pack: string;
  readonly ref: string;
  readonly dryRun: boolean;
}

function options(): Options {
  const { values } = parseArgs({
    options: {
      pack: { type: 'string' },
      ref: { type: 'string', default: 'HEAD' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  if (values.pack === undefined) {
    throw new Error('Name the pack with --pack');
  }
  return { pack: values.pack, ref: values.ref, dryRun: values['dry-run'] };
}

async function packFiles(pack: string, ref: string): Promise<string[]> {
  const listing = await $`git ls-tree --name-only ${ref} content/packs/${pack}/`.cwd(ROOT).text();
  return listing.split('\n').filter((file) => file.endsWith('.json') && path.basename(file) !== 'pack.json');
}

async function writeAll(writes: readonly { file: string; merged: readonly Entry[] }[]): Promise<void> {
  await Promise.all(
    writes.map(async ({ file, merged }) => Bun.write(path.join(ROOT, file), JSON.stringify(merged, undefined, 2))),
  );
  await Bun.spawn(['bun', 'fmt', ...writes.map(({ file }) => file)], { cwd: ROOT }).exited;
}

async function main(): Promise<void> {
  const { pack, ref, dryRun } = options();
  const files = await packFiles(pack, ref);
  const results = await Promise.all(files.map(async (file) => restoreFile(file, ref)));
  const writes = results.flatMap(({ file, merged }) => (merged === undefined ? [] : [{ file, merged }]));
  if (!dryRun && writes.length > 0) {
    await writeAll(writes);
  }
  const report = results.flatMap((result) => result.report);
  console.log(report.join('\n'));
  console.log(`${report.length} restorations${dryRun ? ' (dry run)' : ''}`);
}

await main();
