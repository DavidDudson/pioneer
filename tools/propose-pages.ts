/**
 * Proposes page numbers for mapped entries (ADR-0073): for each mapping in `content/enrichment/<pack>.json` that has an
 * AoN URL and no page, reads the page AoN prints for that URL in the mapping's book from `content/aon/pages/<book>.json`
 * and adds it. A page already mapped is never replaced, and an entry whose book has no table, or whose URL has no page
 * there, is left as it is. Review the diff, then `just content-enrich --pack <pack>` writes it onto the pack.
 */
import path from 'node:path';

import { AonPagesFile, EnrichmentMappingFile } from '@pioneer/rules/sdk';
import type { BookId, EnrichmentMapping } from '@pioneer/rules/sdk';
import { Glob } from 'bun';

const ROOT = path.join(import.meta.dir, '..');
const ENRICHMENT = path.join(ROOT, 'content', 'enrichment');
const TABLES = path.join(ROOT, 'content', 'aon', 'pages');
const JSON_INDENT = 2;

async function readTable(book: BookId): Promise<AonPagesFile['pages']> {
  const file = Bun.file(path.join(TABLES, `${book}.json`));
  const exists = await file.exists();
  const json: unknown = exists ? await file.json() : { pages: {} };
  return AonPagesFile.parse(json).pages;
}

/** The mapping with the page its book's table has for its AoN URL, or `undefined` when nothing is to add. */
function withPage(mapping: EnrichmentMapping, table: AonPagesFile['pages']): EnrichmentMapping | undefined {
  const page = mapping.aon === undefined ? undefined : table[mapping.aon];
  return mapping.page === undefined && page !== undefined ? { ...mapping, page } : undefined;
}

/** Proposes for one pack, writes its mapping file when there is anything new, and returns the report line. */
async function proposePack(file: string): Promise<string> {
  const pack = path.basename(file, '.json');
  const mapping = EnrichmentMappingFile.parse(await Bun.file(path.join(ENRICHMENT, file)).json());
  const books = [...new Set(Object.values(mapping).map(({ book }) => book))];
  const tables = new Map(await Promise.all(books.map(async (book) => [book, await readTable(book)] as const)));
  let added = 0;
  const proposed = Object.fromEntries(
    Object.entries(mapping).map(([slug, entry]) => {
      const next = withPage(entry, tables.get(entry.book) ?? {});
      added += next === undefined ? 0 : 1;
      return [slug, next ?? entry];
    }),
  );
  if (added > 0) {
    await Bun.write(path.join(ENRICHMENT, file), `${JSON.stringify(proposed, undefined, JSON_INDENT)}\n`);
  }
  return `${pack}: ${added} pages proposed of ${Object.keys(mapping).length} mappings`;
}

const files = await Array.fromAsync(new Glob('*.json').scan({ cwd: ENRICHMENT }));
const lines = await Promise.all(files.toSorted().map(async (file) => proposePack(file)));
console.log(lines.join('\n'));
