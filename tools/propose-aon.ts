/**
 * Proposes AoN URLs for committed pack entries (ADR-0071; Epic 2.7): reads the books' listings in `content/aon` and
 * adds `{ book, aon }` for each entry with exactly one match to `content/enrichment/<pack>.json`, keeping every mapping
 * already there. It reports entries with more than one candidate and never invents a page number. Review the diff;
 * `bun run affected` checks the files.
 */
import path from 'node:path';

import { proposeAonMappings } from '@pioneer/rules/catalog';
import type { AonListing } from '@pioneer/rules/catalog';
import { AonListingFile, BookId, ContentEntryFile, EnrichmentMappingFile } from '@pioneer/rules/sdk';
import type { ContentEntry, EntrySlug } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

const ROOT = path.join(import.meta.dir, '..');
const PACKS = path.join(ROOT, 'content', 'packs');
const LISTINGS = path.join(ROOT, 'content', 'aon');
const ENRICHMENT = path.join(ROOT, 'content', 'enrichment');
const JSON_INDENT = 2;
const JsonArray = z.array(z.unknown()).readonly();

async function readListings(): Promise<readonly AonListing[]> {
  const files = await Array.fromAsync(new Glob('*.json').scan({ cwd: LISTINGS }));
  return Promise.all(
    files.map(async (file) => {
      const json: unknown = await Bun.file(path.join(LISTINGS, file)).json();
      return { book: BookId.parse(path.basename(file, '.json')), entries: AonListingFile.parse(json).entries };
    }),
  );
}

async function readMapping(pack: string): Promise<EnrichmentMappingFile> {
  const file = Bun.file(path.join(ENRICHMENT, `${pack}.json`));
  const exists = await file.exists();
  const json: unknown = exists ? await file.json() : {};
  return EnrichmentMappingFile.parse(json);
}

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
async function proposePack(pack: string, listings: readonly AonListing[]): Promise<string> {
  const [entries, mapping] = await Promise.all([readEntries(pack), readMapping(pack)]);
  const mapped = new Set(Object.keys(mapping) as EntrySlug[]);
  const { proposals, ambiguous, unmatched } = proposeAonMappings(entries, listings, mapped);
  if (proposals.size > 0) {
    const merged = Object.fromEntries(
      [...Object.entries(mapping), ...proposals].toSorted(([left], [right]) => left.localeCompare(right)),
    );
    await Bun.write(path.join(ENRICHMENT, `${pack}.json`), `${JSON.stringify(merged, undefined, JSON_INDENT)}\n`);
  }
  return `${pack}: ${proposals.size} proposed, ${ambiguous.length} ambiguous, ${unmatched} unmatched`;
}

const listings = await readListings();
const packFiles = await Array.fromAsync(new Glob('*/pack.json').scan({ cwd: PACKS }));
const lines = await Promise.all(packFiles.map(async (file) => proposePack(path.dirname(file), listings)));
console.log(lines.join('\n'));
