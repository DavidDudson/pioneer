/**
 * `just content-supersedes`: sets `supersedes` on the remaster entries in `content/packs/*` that AoN's `remaster_id`
 * (`content/aon/supersedes/<book>.json`, from `just aon-pages`) says replace a legacy entry that is in the packs too.
 * The files are edited as text so nothing else in the diff moves. Both entries are found by their AoN URL. An id already in `supersedes` is kept, so a second run changes nothing. Pairs
 * with no entry on one side or both are counted, not applied. Review the diff.
 */
import path from 'node:path';

import { AonSupersedesFile, ContentEntryFile } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

import { enrichSupersedesText, supersedesLinks } from './supersedes-enrichment.ts';

const ROOT = path.join(import.meta.dir, '..');
const PACKS = path.join(ROOT, 'content', 'packs');
const SUPERSEDES = path.join(ROOT, 'content', 'aon', 'supersedes');

const packPaths = await Array.fromAsync(new Glob('*/*.json').scan({ cwd: PACKS, absolute: true }));
const files = await Promise.all(
  packPaths
    .filter((file) => path.basename(file) !== 'pack.json')
    .map(async (file) => ({ path: file, text: await Bun.file(file).text() })),
);
const pairPaths = await Array.fromAsync(new Glob('*.json').scan({ cwd: SUPERSEDES, absolute: true }));
const pairs = await Promise.all(pairPaths.map(async (file) => AonSupersedesFile.parse(await Bun.file(file).json())));

const { replaces, unresolved } = supersedesLinks(
  files.flatMap(({ text }) => ContentEntryFile.parse(JSON.parse(text))),
  pairs,
);
const results = files.map(({ path: file, text }) => ({ path: file, enriched: enrichSupersedesText(text, replaces) }));
const changed = results.flatMap(({ path: file, enriched }) =>
  enriched.text === undefined ? [] : [{ path: file, text: enriched.text }],
);
await Promise.all(changed.map(async ({ path: file, text }) => Bun.write(file, text)));
const set = results.reduce((sum, { enriched }) => sum + enriched.set, 0);
console.log(`${set} supersedes set in ${changed.length} files; ${unresolved} AoN pairs had no entry on a side`);
