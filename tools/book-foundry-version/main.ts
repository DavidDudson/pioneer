/**
 * Developer-run (ADR-0031): `just book-foundry-version`. Stamps each book with the foundryvtt/pf2e release it was imported
 * from: the pin of the committed pack that cites it, read from `content/import/<pack>.json` and the pack's entries'
 * sources. Writes `foundryVersion` into `books.json`; nothing is downloaded.
 */
import { readdir } from 'node:fs/promises';
import path from 'node:path';

import { ImportFile } from '@pioneer/interop/foundry';
import { bookRegistry } from '@pioneer/rules/catalog';
import { BookId, FoundryVersion } from '@pioneer/rules/sdk';

import { patchBooks } from '../books-file.ts';

const ROOT = path.resolve(import.meta.dir, '..', '..');
const TAG_PREFIX = 'pf2e-';

/** One entry of a committed pack file, as far as its sources go. */
interface PackEntry {
  readonly sources?: readonly { readonly book?: string }[];
}

/** The books a committed pack cites, from its entries' sources. */
async function booksCited(pack: string): Promise<ReadonlySet<string>> {
  const dir = path.join(ROOT, 'content/packs', pack);
  const names = await readdir(dir);
  const files = names.filter((name) => name.endsWith('.json'));
  const cited = new Set<string>();
  for (const name of files) {
    // oxlint-disable-next-line eslint/no-await-in-loop
    const entries: unknown = await Bun.file(path.join(dir, name)).json();
    for (const entry of Array.isArray(entries) ? (entries as readonly PackEntry[]) : []) {
      for (const source of entry.sources ?? []) {
        if (source.book !== undefined) {
          cited.add(source.book);
        }
      }
    }
  }
  return cited;
}

const patches = new Map<string, Record<string, unknown>>();
const importDir = path.join(ROOT, 'content/import');
const importNames = await readdir(importDir);
for (const name of importNames.filter((file) => file.endsWith('.json'))) {
  // oxlint-disable-next-line eslint/no-await-in-loop
  const importFile: unknown = await Bun.file(path.join(importDir, name)).json();
  const { pin } = ImportFile.parse(importFile);
  const foundryVersion = FoundryVersion.parse(pin.tag.slice(TAG_PREFIX.length));
  // oxlint-disable-next-line eslint/no-await-in-loop
  for (const book of await booksCited(name.replace(/\.json$/u, ''))) {
    if (bookRegistry.book(BookId.parse(book)) !== undefined) {
      patches.set(book, { foundryVersion });
    }
  }
}

await patchBooks(patches);
console.log(`Stamped ${patches.size} books.`);
