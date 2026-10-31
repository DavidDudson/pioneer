import { LegacyImport } from '@pioneer/rules/sdk';
import type { Book, BookId } from '@pioneer/rules/sdk';

/** The pre-remaster books the import takes, as the book registry flags them (`Book.legacy`). */
export interface LegacyBooks {
  /** Books taken whole: every entry Foundry marks Open Game License. */
  readonly whole: ReadonlySet<BookId>;
  /** Books taken only for the entries `OGL_ENTRIES` names; nothing else in them is selected. */
  readonly listed: ReadonlySet<BookId>;
}

/** The legacy books of `books`, by how much of each is imported. */
export function legacyBooks(books: readonly Book[]): LegacyBooks {
  const idsOf = (scope: LegacyImport): ReadonlySet<BookId> =>
    new Set(books.filter(({ legacy }) => legacy === scope).map(({ id }) => id));
  return { whole: idsOf(LegacyImport.Whole), listed: idsOf(LegacyImport.Listed) };
}
