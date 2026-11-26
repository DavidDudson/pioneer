/**
 * The book registry file, `libs/rules/catalog/src/books.json`, for the dev tools that fill in what a book's sources say
 * about it (`just aon-sources`, `just book-credits`). Each tool hands over the fields it found per book; they are merged
 * into the book's entry as written in the file, the whole registry is validated, and the file is written back in its
 * order.
 */
import { Books } from '@pioneer/rules/sdk';
import type { ErrataLabel, FoundryVersion, PaizoStoreUrl, ProductLine } from '@pioneer/rules/sdk';

const FILE = `${import.meta.dir}/../libs/rules/catalog/src/books.json`;

/** The fields a tool may set on a book as the file writes them (the release date is its ISO text). */
export interface BookPatch {
  readonly productLine?: ProductLine;
  readonly storeUrl?: PaizoStoreUrl;
  readonly errata?: ErrataLabel;
  readonly released?: string;
  readonly foundryVersion?: FoundryVersion;
}

/** The fields to set on each book, by book id. */
export type BookPatches = ReadonlyMap<string, BookPatch>;

/** One book as the file writes it. */
interface RawBook {
  readonly id: string;
}

/** `book` with `fields` set over it. */
function patched(book: RawBook, fields: BookPatch | undefined): RawBook {
  return { ...book, ...fields };
}

/** Merges `patches` into the registry and writes it; a book id the registry does not hold is an error. */
export async function patchBooks(patches: BookPatches): Promise<void> {
  // SAFETY: the registry file is a JSON array of books, and `Books.parse(raw)` on the next line throws on any other shape.
  const raw = (await Bun.file(FILE).json()) as readonly RawBook[];
  Books.parse(raw);
  const known = new Set(raw.map(({ id }) => id));

  for (const id of patches.keys()) {
    if (!known.has(id)) {
      throw new Error(`${id} is not in the book registry`);
    }
  }

  const merged = raw.map((book) => patched(book, patches.get(book.id)));
  Books.parse(merged);
  await Bun.write(FILE, `${JSON.stringify(merged, undefined, 2)}\n`);
}
