/**
 * Maps "(Creature) Ability" actions to their creature's AoN page (Epic 9.5): AoN has no row for the ability, it sits in
 * the creature's stat block. Reads each pack's creature mappings in `content/enrichment/<pack>.json` and adds the
 * creature's `{ book, aon, page }` for every action of that pack whose parenthetical is exactly one of them. Entries
 * already there keep their place and key order. It reports the rest as exceptions and never guesses.
 */
import path from 'node:path';

import { proposeCreatureActions } from '@pioneer/rules/catalog';
import { ContentEntryFile, ContentKind, EnrichmentMappingFile } from '@pioneer/rules/sdk';
import type { ContentEntry, EntrySlug } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

const ROOT = path.join(import.meta.dir, '..');
const PACKS = path.join(ROOT, 'content', 'packs');
const ENRICHMENT = path.join(ROOT, 'content', 'enrichment');
const JSON_INDENT = 2;
const JsonArray = z.array(z.unknown()).readonly();

async function readEntries(pack: string): Promise<readonly ContentEntry[]> {
  const paths = await Array.fromAsync(new Glob('*.json').scan({ cwd: path.join(PACKS, pack), absolute: true }));
  const files = await Promise.all(
    paths
      .filter((file) => path.basename(file) !== 'pack.json')
      .map(async (file) => Bun.file(file).json() as Promise<unknown>),
  );
  return files.flatMap((json) => ContentEntryFile.parse(JsonArray.parse(json)));
}

/** Proposes for one pack, writes its mapping file when there is anything new, and returns the report line. */
async function proposePack(pack: string): Promise<string> {
  const file = Bun.file(path.join(ENRICHMENT, `${pack}.json`));
  const exists = await file.exists();
  const json: unknown = exists ? await file.json() : {};
  const mapping = EnrichmentMappingFile.parse(json);
  // Merge into the file as written: parsing reorders each entry's keys, which would rewrite every line.
  const written = z.record(z.string(), z.unknown()).parse(json);
  const entries = await readEntries(pack);
  const creatures = new Map(
    entries.filter((entry) => entry.kind === ContentKind.Creature).map((entry) => [entry.slug, mapping[entry.slug]]),
  );
  const { proposals, excepted } = proposeCreatureActions(
    entries.filter((entry) => entry.kind === ContentKind.Action),
    new Map([...creatures].flatMap(([slug, found]) => (found === undefined ? [] : [[slug, found] as const]))),
    new Set(Object.keys(mapping) as EntrySlug[]),
  );
  if (proposals.size > 0) {
    const merged = Object.fromEntries(
      [
        ...Object.entries(written),
        ...[...proposals].map(([slug, { book, aon, page }]) => [slug, { book, aon, page }] as const),
      ].toSorted(([left], [right]) => left.localeCompare(right)),
    );
    await Bun.write(file, `${JSON.stringify(merged, undefined, JSON_INDENT)}\n`);
  }
  return `${pack}: ${proposals.size} mapped, ${excepted.length} excepted`;
}

const packFiles = await Array.fromAsync(new Glob('*/pack.json').scan({ cwd: PACKS }));
const lines = await Promise.all(packFiles.map(async (file) => proposePack(path.dirname(file))));
console.log(lines.filter((line) => !line.endsWith('0 mapped, 0 excepted')).join('\n'));
