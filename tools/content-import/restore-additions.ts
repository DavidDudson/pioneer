import path from 'node:path';
import { parseArgs } from 'node:util';

/**
 * `just content-restore --pack <pack> [--ref HEAD] [--dry-run]`: after a re-import replaced `content/packs/<pack>/`,
 * puts back the hand additions the import cannot know about (ADR-0031: the committed pack is the source of truth).
 * Entries are matched by id against the files at `--ref`, and the merge is per field:
 *
 * - `description`: the ref wins. Hand edits restore link text, names and typos the import loses or re-breaks.
 * - `rules`: when the ref holds a rule the import lacks, the ref's whole list wins, since a hand-fixed rule and the
 *   import's version of it cannot be told apart per rule. When both hold the same rules, the ref's order is kept.
 * - `data`: a key the ref has and the import dropped (`dismiss`, `modes`, `prerequisitePredicate`, ...) comes back.
 *   Keys the import now sets stay, so its new coverage survives.
 *
 * Everything else is the import's. The report names each restored entry and field; review it, because a field the
 * import now translates better than the ref is also overwritten by "ref wins".
 */
import { $ } from 'bun';

type Json = Record<string, unknown>;

interface Entry {
  readonly id: string;
  readonly name: string;
  readonly description?: unknown;
  readonly rules?: unknown;
  readonly data?: Json;
}

interface Restored {
  readonly entry: Entry;
  readonly fields: readonly string[];
}

interface FileResult {
  readonly file: string;
  readonly report: readonly string[];
  readonly merged: readonly Entry[] | undefined;
}

const ROOT = path.resolve(import.meta.dir, '../..');

const same = (left: unknown, right: unknown): boolean => JSON.stringify(left) === JSON.stringify(right);

function ruleSet(rules: unknown): Set<string> {
  const list = (rules ?? []) as readonly unknown[];
  return new Set(list.map((rule) => JSON.stringify(rule)));
}

function mergedRules(committed: Entry, fresh: Entry): Restored {
  const have = ruleSet(fresh.rules);
  const held = ruleSet(committed.rules);
  const lost = [...held].some((rule) => !have.has(rule));
  const reordered = held.size === have.size && !same(committed.rules, fresh.rules);
  return {
    entry: lost || reordered ? { ...fresh, rules: committed.rules } : fresh,
    fields: lost ? ['rules'] : [],
  };
}

function mergedData(committed: Entry, fresh: Entry): Restored {
  const held = Object.entries(committed.data ?? {});
  const dropped = held.filter(([key]) => !(key in (fresh.data ?? {})));
  return {
    entry: dropped.length > 0 ? { ...fresh, data: { ...fresh.data, ...Object.fromEntries(dropped) } } : fresh,
    fields: dropped.map(([key]) => `data.${key}`),
  };
}

function restore(committed: Entry, fresh: Entry): Restored {
  const described = same(committed.description, fresh.description)
    ? fresh
    : { ...fresh, description: committed.description };
  const rules = mergedRules(committed, described);
  const data = mergedData(committed, rules.entry);
  return {
    entry: data.entry,
    fields: [...(described === fresh ? [] : ['description']), ...rules.fields, ...data.fields],
  };
}

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

async function restoreFile(file: string, ref: string): Promise<FileResult> {
  const target = Bun.file(path.join(ROOT, file));
  const fileExists = await target.exists();
  if (!fileExists) {
    return { file, report: [], merged: undefined };
  }
  const refText = await $`git show ${ref}:${file}`.cwd(ROOT).text();
  const committed = JSON.parse(refText) as Entry[];
  const imported = JSON.parse(await target.text()) as Entry[];
  const byId = new Map(imported.map((entry) => [entry.id, entry]));
  const restored = new Map(
    committed.flatMap((old) => {
      const incoming = byId.get(old.id);
      return incoming === undefined ? [] : [[old.id, restore(old, incoming)] as const];
    }),
  );
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
  await Bun.spawn(['node_modules/.bin/oxfmt', ...writes.map(({ file }) => file)], { cwd: ROOT }).exited;
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
