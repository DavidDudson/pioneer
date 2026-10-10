/**
 * Sets `triggerEvent` on every action in `content/packs` whose trigger wording the matcher knows and that has none yet
 * (ADR-0031: the committed packs are the source, so the pass edits them). Review the diff; what it leaves is listed by
 * `bun run content:coverage` and set by hand.
 */
import { Glob } from 'bun';
import { join } from 'node:path';

import { triggerMatches } from '@pioneer/rules/catalog';
import { ContentEntryFile } from '@pioneer/rules/sdk';
import type { ContentEntry, ContentId, ContentText } from '@pioneer/rules/sdk';

import { enrichTriggerFile } from './trigger-enrichment.ts';

const PACKS = join(import.meta.dir, '..', 'content', 'packs');
const JSON_INDENT = 2;

interface EntryFile {
  readonly path: string;
  readonly json: readonly unknown[];
}

const paths = await Array.fromAsync(new Glob('*/*.json').scan({ cwd: PACKS, absolute: true }));
const files: EntryFile[] = await Promise.all(
  paths
    .filter((path) => !path.endsWith('/pack.json'))
    .map(async (path): Promise<EntryFile> => ({ path, json: await Bun.file(path).json() })),
);
const entries: ContentEntry[] = files.flatMap(({ json }) => ContentEntryFile.parse(json));
const names = new Map<ContentId, ContentText>(entries.map((entry) => [entry.id, entry.name]));
const matches = new Map(triggerMatches(entries, names).map((match) => [match.entry, match.triggerEvent]));

const written: string[] = [];
for (const { path, json } of files) {
  const enriched = enrichTriggerFile(json, matches);
  if (enriched !== undefined) {
    await Bun.write(path, `${JSON.stringify(enriched, undefined, JSON_INDENT)}\n`);
    written.push(path);
  }
}
if (written.length > 0) {
  const format = Bun.spawn(['node_modules/.bin/oxfmt', ...written], { cwd: join(import.meta.dir, '..') });
  await format.exited;
}
console.log(`${matches.size} trigger events set in ${written.length} files`);
