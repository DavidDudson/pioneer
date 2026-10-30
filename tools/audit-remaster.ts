/**
 * Audits the remaster books (Epic 9.7): lists the AoN listing rows the packs have no entry of the same name for and
 * says why for each (`classifyRemasterCandidate`). Prints a count per book and class; pass a class name to list its
 * rows (`bun tools/audit-remaster.ts review`), and `--book <id>` to narrow to one book. Reads only; writes nothing.
 */
import path from 'node:path';

import { classifyRemasterCandidate, normaliseName } from '@pioneer/rules/catalog';
import type { RemasterClass } from '@pioneer/rules/catalog';
import { AonListingFile, AonPagesFile, ContentEntryFile } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

const ROOT = path.join(import.meta.dir, '..');
const PACKS = path.join(ROOT, 'content', 'packs');
const LISTINGS = path.join(ROOT, 'content', 'aon');
const BOOKS: readonly string[] = [
  'player-core',
  'gm-core',
  'player-core-2',
  'guns-and-gears',
  'war-of-immortals',
  'battlecry',
  'treasure-vault',
  'impossible-magic',
  'rage-of-elements',
  'high-seas',
  'rival-academies',
];
const CLASSES: readonly RemasterClass[] = ['activation', 'variant', 'missing-kind', 'non-entry', 'typo', 'review'];
const JsonArray = z.array(z.unknown()).readonly();

/** The pack names AoN's matcher reads: the name, without its parenthetical, and without its comma suffix. */
function variants(name: string): readonly string[] {
  const withoutParenthetical = name.replace(/\s*\([^)]*\)\s*$/u, '');
  return [name, withoutParenthetical, withoutParenthetical.replace(/,.*$/u, '')];
}

async function readPackNames(): Promise<ReadonlySet<string>> {
  const paths = await Array.fromAsync(new Glob('*/*.json').scan({ cwd: PACKS, absolute: true }));
  const files = await Promise.all(
    paths
      .filter((file) => path.basename(file) !== 'pack.json')
      .map(async (file) => Bun.file(file).json() as Promise<unknown>),
  );
  const entries = files.flatMap((json) => ContentEntryFile.parse(JsonArray.parse(json)));
  return new Set(entries.flatMap(({ name }) => variants(name).map((variant) => normaliseName(variant))));
}

/** An AoN listing row, as the audit reads it. */
interface Row {
  readonly type: string;
  readonly name: string;
}

async function readRows(book: string): Promise<readonly Row[]> {
  const listing = AonListingFile.parse(await Bun.file(path.join(LISTINGS, `${book}.json`)).json());
  const pagesFile = Bun.file(path.join(LISTINGS, 'pages', `${book}.json`));
  const pagesExist = await pagesFile.exists();
  const { entries } = pagesExist ? AonPagesFile.parse(await pagesFile.json()) : { entries: [] };
  return [...listing.entries, ...entries];
}

const args = Bun.argv.slice(2);
const bookFlag = args.indexOf('--book');
const only = bookFlag === -1 ? undefined : args[bookFlag + 1];
const show = args.find((arg) => (CLASSES as readonly string[]).includes(arg));
const packNames = await readPackNames();
const books = BOOKS.filter((candidate) => only === undefined || candidate === only);

/** The report lines of one book: its counts per class and, when a class is asked for, that class's rows. */
async function report(book: string): Promise<readonly string[]> {
  const rows = await readRows(book);
  const missing = rows.filter((row) => !variants(row.name).some((variant) => packNames.has(normaliseName(variant))));
  const classified = missing.map((row) => ({ row, class: classifyRemasterCandidate(row, packNames) }));
  const counts = CLASSES.map((name) => `${name} ${classified.filter((item) => item.class === name).length}`);
  const listed =
    show === undefined
      ? []
      : classified.filter((item) => item.class === show).map((item) => `  ${item.row.type}: ${item.row.name}`);
  return [`${book}: ${missing.length} of ${rows.length} rows (${counts.join(', ')})`, ...listed];
}

const reports = await Promise.all(books.map(async (book) => report(book)));
const lines = reports.flat();
console.log(lines.join('\n'));
