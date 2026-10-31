/**
 * `just content-enrich --pack <pack>` (ADR-0070, ADR-0071; story _content-enrich_): writes the page and AoN URL that
 * `content/enrichment/<pack>.json` maps for an entry onto the entry's book source for that book in
 * `content/packs/<pack>/*.json`. A value already set is never replaced and there is no way to force it, so a second run
 * changes nothing. A mapping that doesn't resolve (an unknown slug or book, or a book the entry doesn't cite) is
 * reported and the exit code is 1; the mappings that do resolve are still applied. Review the diff, and check
 * `bun run content:coverage`.
 */
import path from 'node:path';
import { parseArgs } from 'node:util';

import { bookRegistry, checkEnrichment } from '@pioneer/rules/catalog';
import { ContentEntryFile, EnrichmentMappingFile, PackId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

import { enrichSourcesFile } from './source-enrichment.ts';

const ROOT = path.join(import.meta.dir, '..');
const JSON_INDENT = 2;
const JsonArray = z.array(z.unknown()).readonly();

const { values } = parseArgs({ options: { pack: { type: 'string' } } });
if (values.pack === undefined) {
  throw new Error('usage: just content-enrich --pack <pack>');
}
const pack = PackId.parse(values.pack);
const packDir = path.join(ROOT, 'content', 'packs', pack);
const mappingFile = Bun.file(path.join(ROOT, 'content', 'enrichment', `${pack}.json`));
const mappingExists = await mappingFile.exists();
if (!mappingExists) {
  throw new Error(`content/enrichment/${pack}.json does not exist`);
}
const mapping = EnrichmentMappingFile.parse(await mappingFile.json());

const paths = await Array.fromAsync(new Glob('*.json').scan({ cwd: packDir, absolute: true }));
const files = await Promise.all(
  paths
    .filter((file) => path.basename(file) !== 'pack.json')
    .map(async (file) => ({ path: file, json: JsonArray.parse(await Bun.file(file).json()) })),
);
const slugs = new Set(files.flatMap(({ json }) => ContentEntryFile.parse(json).map(({ slug }) => slug)));
const { applicable, issues } = checkEnrichment(mapping, { pack, slugs, registry: bookRegistry });

const results = files.map(({ path: file, json }) => ({ path: file, enriched: enrichSourcesFile(json, applicable) }));
const changed = results.flatMap(({ path: file, enriched }) =>
  enriched.json === undefined ? [] : [{ path: file, json: enriched.json }],
);
await Promise.all(
  changed.map(async ({ path: file, json }) => Bun.write(file, `${JSON.stringify(json, undefined, JSON_INDENT)}\n`)),
);
if (changed.length > 0) {
  const format = Bun.spawn(['bun', 'fmt', ...changed.map((file) => file.path)], { cwd: ROOT });
  const formatted = await format.exited;
  if (formatted !== 0) {
    throw new Error(`bun fmt exited with ${formatted}`);
  }
}

const uncited = results.flatMap(({ enriched }) => enriched.uncited);
const pages = results.reduce((sum, { enriched }) => sum + enriched.pages, 0);
const aons = results.reduce((sum, { enriched }) => sum + enriched.aons, 0);
console.log(`${pack}: ${pages} pages and ${aons} AoN URLs set in ${changed.length} files`);
for (const issue of issues) {
  console.error(`${issue.path.join('.')}: ${JSON.stringify(issue.message)}`);
}
for (const slug of uncited) {
  console.error(`${slug}: the entry cites no source for its mapping's book`);
}
process.exitCode = issues.length + uncited.length > 0 ? 1 : 0;
