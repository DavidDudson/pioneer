import { Books } from '@pioneer/rules/sdk';
import type { Book, BookId } from '@pioneer/rules/sdk';

import registry from './books.json';

/**
 * Every published book Pioneer cites (content-model.md, "Books and source references"), validated on load: each
 * book once, each with a title key. Source references name books by id; this resolves them.
 */
export class BookRegistry {
  public readonly books: readonly Book[];
  readonly #byId: ReadonlyMap<BookId, Book>;

  public constructor(books: Books) {
    this.books = books;
    this.#byId = new Map(books.map((book) => [book.id, book]));
  }

  /** Validates `input` as the registry; throws a `ZodError` whose issues are message descriptors. */
  public static parse(input: unknown): BookRegistry {
    return new BookRegistry(Books.parse(input));
  }

  public book(id: BookId): Book | undefined {
    return this.#byId.get(id);
  }
}

/** The registry in `books.json`. */
export const bookRegistry: BookRegistry = BookRegistry.parse(registry);
