/**
 * Sets `data.staff` on every staff in `content/packs` whose printed spell list the matcher can read and that has none
 * yet (ADR-0031: the committed packs are the source, so the pass edits them). Review the diff; what it leaves is
 * listed by `bun run content:coverage` and set by hand, or once the book that holds its spells is imported.
 */
import path from 'node:path';

import { staffMatches } from '@pioneer/rules/catalog';
import { ContentEntryFile } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

import { enrichStaffFile } from './staff-enrichment.ts';

const ROOT = path.join(import.meta.dir, '..');
const PACKS = path.join(ROOT, 'content', 'packs');
const JSON_INDENT = 2;
const JsonArray = z.array(z.unknown()).readonly();

interface EntryFile {
  readonly path: string;
  readonly json: readonly unknown[];
}

async function readEntryFile(file: string): Promise<EntryFile> {
  const json: unknown = await Bun.file(file).json();
  return { path: file, json: JsonArray.parse(json) };
}

const paths = await Array.fromAsync(new Glob('*/*.json').scan({ cwd: PACKS, absolute: true }));
const files = await Promise.all(
  paths.filter((file) => path.basename(file) !== 'pack.json').map(async (file) => readEntryFile(file)),
);
const entries = files.flatMap(({ json }) => ContentEntryFile.parse(json));
const matches = new Map(staffMatches(entries).map((match) => [match.entry, match.staff]));

const enriched = files.flatMap(({ path: file, json }) => {
  const changed = enrichStaffFile(json, matches);
  return changed === undefined ? [] : [{ path: file, json: changed }];
});
await Promise.all(
  enriched.map(async ({ path: file, json }) => Bun.write(file, `${JSON.stringify(json, undefined, JSON_INDENT)}\n`)),
);
if (enriched.length > 0) {
  const format = Bun.spawn(['node_modules/.bin/oxfmt', ...enriched.map((file) => file.path)], { cwd: ROOT });
  const formatted = await format.exited;
  if (formatted !== 0) {
    throw new Error(`oxfmt exited with ${formatted}`);
  }
}
console.log(`${matches.size} staves set in ${enriched.length} files`);
