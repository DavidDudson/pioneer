/**
 * Reads which legacy entries remaster entries replace (ADR-0077) from `content/aon`: the legacy URLs in
 * `supersedes/<book>.json`, and the names the book's AoN listing and page files give them. AoN supplies selection
 * only; the imported rules text is Foundry's.
 */
import path from 'node:path';

import { replacedLegacy } from '@pioneer/interop/foundry';
import type { BookReplacements, ReplacedLegacy } from '@pioneer/interop/foundry';
import { AonListedEntry, AonSupersedesFile, AonUrl, BookId } from '@pioneer/rules/sdk';
import { Glob } from 'bun';
import * as z from 'zod';

/** The entries of a book's listing (`<book>.json`) or page file (`pages/<book>.json`); other fields are not read. */
const Listed = z.looseObject({ entries: z.array(AonListedEntry) });

const AON = path.resolve(import.meta.dir, '..', '..', 'content', 'aon');

/** The entries of an AoN file that lists them, or none when the file is absent. */
async function listed(file: string): Promise<readonly AonListedEntry[]> {
  const source = Bun.file(file);
  const present = await source.exists();
  return present ? Listed.parse(await source.json()).entries : [];
}

/** The names a book's Sources listing and its fetched pages give by URL. */
async function namesOf(book: string): Promise<ReadonlyMap<AonUrl, string>> {
  const files = [path.join(AON, `${book}.json`), path.join(AON, 'pages', `${book}.json`)];
  const listings = await Promise.all(files.map(async (file) => listed(file)));
  return new Map(listings.flat().map(({ url, name }) => [url, name]));
}

/** The replaced legacy entries of every book with a supersedes file. */
export async function loadReplacedLegacy(): Promise<ReplacedLegacy> {
  const files = await Array.fromAsync(new Glob('*.json').scan({ cwd: path.join(AON, 'supersedes') }));
  const books: BookReplacements[] = await Promise.all(
    files.map(async (file) => {
      const book = path.basename(file, '.json');
      const { replacedBy } = AonSupersedesFile.parse(await Bun.file(path.join(AON, 'supersedes', file)).json());
      const replaced = Object.keys(replacedBy).map((url) => AonUrl.parse(url));
      return { book: BookId.parse(book), replaced, names: await namesOf(book) };
    }),
  );
  return replacedLegacy(books);
}
