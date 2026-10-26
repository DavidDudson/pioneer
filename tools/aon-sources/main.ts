/**
 * Developer-run listing fetch (ADR-0071): `just aon-sources [--book <book>...]`. For each registered book with an AoN
 * Sources page, asks politely for that one page (`polite-fetch.ts`) and keeps its name-to-URL table in
 * `content/aon/<book>.json`, with the page's `ETag` so the next run asks only whether it changed. Nothing else on AoN
 * is fetched, no page is stored, and the run stops at the first refusal. Never part of CI, the importer or the app.
 */
import { mkdir } from 'node:fs/promises';
import { parseArgs } from 'node:util';

import { bookRegistry } from '@pioneer/rules/catalog';
import { AonListingFile } from '@pioneer/rules/sdk';

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

async function fetchBook(id: string, sourceUrl: string): Promise<BookResult> {
  const file = `${OUT_DIR}/${id}.json`;
  const outcome = await client.get(new URL(sourceUrl), await storedEtag(file));
  if (outcome.kind === 'refused') {
    return { line: `Stopped: ${outcome.reason}`, refused: true };
  }
  if (outcome.kind === 'unchanged') {
    return { line: `${id}: unchanged`, refused: false };
  }
  const { entries, skipped } = parseSources(outcome.html);
  if (entries.length === 0) {
    return { line: `${id}: no entries found, so the stored listing is left as it is`, refused: false };
  }
  await save(file, outcome.etag, entries);
  return { line: `${id}: ${entries.length} entries, ${skipped.length} links skipped`, refused: false };
}

await mkdir(OUT_DIR, { recursive: true });
for (const { id, aonSourceUrl } of books) {
  // Sequential on purpose: one request at a time (ADR-0071).
  // oxlint-disable-next-line eslint/no-await-in-loop
  const { line, refused } = await fetchBook(id, aonSourceUrl ?? '');
  console.log(line);
  if (refused) {
    process.exitCode = 1;
    break;
  }
}
