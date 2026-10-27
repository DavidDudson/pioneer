/**
 * Developer-run page fetch (ADR-0073): `just aon-pages [--book <book>...]`. For each registered book with an AoN Sources
 * page, asks AoN's search index politely (`../aon-sources/polite-fetch.ts`) for the entries printed in that book and
 * keeps each entry's URL and page in `content/aon/pages/<book>.json`, with the entries the book's Sources page lacks. Nothing else is stored, and the run stops at the
 * first refusal. Never part of CI, the importer or the app.
 */
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { bookRegistry } from '@pioneer/rules/catalog';
import { AonListingFile } from '@pioneer/rules/sdk';
import type { AonListedEntry, AonUrl, PageNumber } from '@pioneer/rules/sdk';

import { PoliteClient } from '../aon-sources/polite-fetch.ts';
import { parseHits } from './parse.ts';
import type { PageHits } from './parse.ts';

const LISTINGS = `${import.meta.dir}/../../content/aon`;
const OUT_DIR = `${LISTINGS}/pages`;
const SEARCH = new URL('https://elasticsearch.aonprd.com/aon/_search');
const USER_AGENT = 'pioneer-importer/0.1 (+https://github.com/DavidDudson/pioneer; davidjohndudson@gmail.com)';
const INTERVAL_MS = 2000;
const PAGE_SIZE = 500;
const WINDOW = 10_000;

const { values } = parseArgs({ options: { book: { type: 'string', multiple: true } } });
const wanted = new Set(values.book);
const books = bookRegistry.books.filter(
  (book) => book.aonSourceUrl !== undefined && (wanted.size === 0 || wanted.has(book.id)),
);
const client = new PoliteClient({
  userAgent: USER_AGENT,
  intervalMs: INTERVAL_MS,
  fetch,
  sleep: async (ms: number): Promise<void> => Bun.sleep(ms),
  now: (): number => performance.now(),
  robotsForbiddenIsOpen: true,
});

/** What fetching one book did, in a line; a refusal ends the run. */
interface BookResult {
  readonly line: string;
  readonly refused: boolean;
}

function query(sourceId: string, from: number): unknown {
  return {
    from,
    size: PAGE_SIZE,
    sort: ['_doc'],
    _source: ['url', 'name', 'type', 'source_markdown'],
    query: { match_phrase: { source_markdown: `Sources.aspx?ID=${sourceId}` } },
  };
}

/** The URLs the book's Sources page lists, so the entries only the index holds can be told apart. */
async function listedUrls(id: string): Promise<ReadonlySet<AonUrl>> {
  const file = Bun.file(`${LISTINGS}/${id}.json`);
  const exists = await file.exists();
  const json: unknown = exists ? await file.json() : { entries: [] };
  return new Set(AonListingFile.parse(json).entries.map(({ url }) => url));
}

function byName(left: AonListedEntry, right: AonListedEntry): number {
  return left.url.localeCompare(right.url) || left.name.localeCompare(right.name);
}

async function save(id: string, found: Collected): Promise<void> {
  const listed = await listedUrls(id);
  const sorted = Object.fromEntries([...found.pages].toSorted(([left], [right]) => left.localeCompare(right)));
  const entries = found.entries.filter(({ url }) => !listed.has(url)).toSorted(byName);
  await Bun.write(`${OUT_DIR}/${id}.json`, `${JSON.stringify({ pages: sorted, entries }, undefined, 2)}\n`);
}

/** A book's pages and the hits without one, or the reason the run must stop. */
interface Collected {
  readonly pages: ReadonlyMap<AonUrl, PageNumber>;
  readonly entries: readonly AonListedEntry[];
  readonly skipped: number;
  readonly stop?: string;
}

/** One window of a book's hits, or the reason the run must stop. */
async function ask(id: string, sourceId: string, from: number): Promise<PageHits | string> {
  const outcome = await client.postJson(SEARCH, query(sourceId, from));
  if (outcome.kind !== 'fresh') {
    return outcome.kind === 'refused' ? outcome.reason : 'no answer';
  }
  const parsed = parseHits(JSON.parse(outcome.html), sourceId);
  return parsed.total > WINDOW ? `${id} has ${parsed.total} hits, more than one window of ${WINDOW}` : parsed;
}

function merge(into: Map<AonUrl, PageNumber>, from: ReadonlyMap<AonUrl, PageNumber>): void {
  for (const [url, page] of from) {
    into.set(url, page);
  }
}

async function collect(id: string, sourceId: string): Promise<Collected> {
  const pages = new Map<AonUrl, PageNumber>();
  const entries: AonListedEntry[] = [];
  let skipped = 0;
  for (let from = 0, total = 1; from < total; from += PAGE_SIZE) {
    // Sequential on purpose: one request at a time (ADR-0073).
    // oxlint-disable-next-line eslint/no-await-in-loop
    const answer = await ask(id, sourceId, from);
    if (typeof answer === 'string') {
      return { pages, entries, skipped, stop: answer };
    }
    ({ total } = answer);
    skipped += answer.skipped;
    entries.push(...answer.entries);
    merge(pages, answer.pages);
  }
  return { pages, entries, skipped };
}

async function fetchBook(id: string, sourceUrl: string): Promise<BookResult> {
  const sourceId = new URL(sourceUrl).searchParams.get('ID') ?? '';
  const found = await collect(id, sourceId);
  const { pages, skipped, stop } = found;
  if (stop !== undefined) {
    return { line: `Stopped: ${stop}`, refused: true };
  }
  await save(id, found);
  return { line: `${id}: ${pages.size} pages, ${skipped} hits without one`, refused: false };
}

await mkdir(OUT_DIR, { recursive: true });
for (const { id, aonSourceUrl } of books) {
  // oxlint-disable-next-line eslint/no-await-in-loop
  const { line, refused } = await fetchBook(id, aonSourceUrl ?? '');
  console.log(line);
  if (refused) {
    process.exitCode = 1;
    break;
  }
}
