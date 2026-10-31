/**
 * Developer-run listing fetch (ADR-0071): `just aon-sources [--book <book>...]`. For each registered book with an AoN
 * Sources page, asks politely for that one page (`polite-fetch.ts`) and keeps its name-to-URL table in
 * `content/aon/<book>.json`, with the page's `ETag` so the next run asks only whether it changed. The page's product line,
 * Paizo Store link and latest errata go into `books.json`, with the release date of a book that has none. Nothing else on AoN
 * is fetched, no page is stored, and the run stops at the first refusal. Never part of CI, the importer or the app.
 */
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { bookRegistry } from '@pioneer/rules/catalog';
import { AonListingFile } from '@pioneer/rules/sdk';
import type { Book } from '@pioneer/rules/sdk';

import { patchBooks } from '../books-file.ts';
import type { BookPatches } from '../books-file.ts';
import { parseBookDetails } from './details.ts';
import { parseSources } from './parse.ts';
import type { ListedEntry } from './parse.ts';
import { PoliteClient } from './polite-fetch.ts';

const OUT_DIR = `${import.meta.dir}/../../content/aon`;
const USER_AGENT = 'pioneer-importer/0.1 (+https://github.com/DavidDudson/pioneer; davidjohndudson@gmail.com)';
const INTERVAL_MS = 2000;

async function storedEtag(file: string): Promise<string | undefined> {
  const stored = Bun.file(file);
  const exists = await stored.exists();
  if (!exists) {
    return undefined;
  }
  const json: unknown = await stored.json();
  return AonListingFile.parse(json).etag;
}

async function save(file: string, etag: string | undefined, entries: readonly ListedEntry[]): Promise<void> {
  await Bun.write(file, `${JSON.stringify({ etag, entries }, undefined, 2)}\n`);
}

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
});

/** What fetching one book's listing did, in a line; a refusal ends the run. */
interface BookResult {
  readonly line: string;
  readonly refused: boolean;
}

/** The details found on each book's page, to write into the registry once the run ends. */
const found = new Map<string, Record<string, unknown>>();

/** Keeps what the page says about `book` for the registry, and says when AoN dates it differently. */
function recordDetails(book: Book, html: string): string {
  const { released, ...details } = parseBookDetails(html);
  found.set(book.id, book.released === undefined && released !== undefined ? { ...details, released } : details);
  const differs = book.released !== undefined && released !== undefined && released !== book.released.toString();
  return differs ? `, AoN dates it ${released}` : '';
}

/** A page just fetched. */
interface FetchedPage {
  readonly id: string;
  readonly html: string;
  readonly etag: string | undefined;
}

/** Stores the page's listing, unless it held none. */
async function saveListing(file: string, page: FetchedPage, dateNote: string): Promise<BookResult> {
  const { entries, skipped } = parseSources(page.html);
  if (entries.length === 0) {
    return { line: `${page.id}: no entries found, so the stored listing is left as it is${dateNote}`, refused: false };
  }
  await save(file, page.etag, entries);
  return { line: `${page.id}: ${entries.length} entries, ${skipped.length} links skipped${dateNote}`, refused: false };
}

async function fetchBook(book: Book): Promise<BookResult> {
  const { id, aonSourceUrl } = book;
  const file = `${OUT_DIR}/${id}.json`;
  // A book whose details are not in the registry yet is asked for in full, whatever the ETag says.
  const etag = book.productLine === undefined ? undefined : await storedEtag(file);
  const outcome = await client.get(new URL(aonSourceUrl ?? ''), etag);
  if (outcome.kind === 'refused') {
    return { line: `Stopped: ${outcome.reason}`, refused: true };
  }
  if (outcome.kind === 'unchanged') {
    return { line: `${id}: unchanged`, refused: false };
  }
  const dateNote = recordDetails(book, outcome.html);
  return saveListing(file, { id, html: outcome.html, etag: outcome.etag }, dateNote);
}

await mkdir(OUT_DIR, { recursive: true });
for (const book of books) {
  // Sequential on purpose: one request at a time (ADR-0071).
  // oxlint-disable-next-line eslint/no-await-in-loop
  const { line, refused } = await fetchBook(book);
  console.log(line);
  if (refused) {
    process.exitCode = 1;
    break;
  }
}
const patches: BookPatches = found;
await patchBooks(patches);
