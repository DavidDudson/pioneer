/**
 * Sets `removesConditions` on every spell, feat, action and consumable in `content/packs` that a condition names as
 * easing it (ADR-0031: the committed packs are the source, so the pass edits them). Review the diff; an entry a
 * condition names that the pass does not describe is listed and fails the run, to be added to its table.
 */
import path from 'node:path';

import { ContentEntryFile } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

import { enrichRemovalFile, removalMatches } from './removal-enrichment.ts';

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
const { removals, unmapped } = removalMatches(entries);
if (unmapped.length > 0) {
  throw new Error(`Conditions name entries the removal table does not describe: ${unmapped.join(', ')}`);
}

const enriched = files.flatMap(({ path: file, json }) => {
  const changed = enrichRemovalFile(json, removals);
  return changed === undefined ? [] : [{ path: file, json: changed }];
});
await Promise.all(
  enriched.map(async ({ path: file, json }) => Bun.write(file, `${JSON.stringify(json, undefined, JSON_INDENT)}\n`)),
);
if (enriched.length > 0) {
  const format = Bun.spawn(['bun', 'fmt', ...enriched.map((file) => file.path)], { cwd: ROOT });
  const formatted = await format.exited;
  if (formatted !== 0) {
    throw new Error(`bun fmt exited with ${formatted}`);
  }
}
console.log(`${removals.size} entries ease conditions, set in ${enriched.length} files`);
