import { bookRegistry } from '@pioneer/rules/catalog';
import type { BookId, BookLabel } from '@pioneer/rules/sdk';
import { bookTitle, LICENSE_LABELS, PUBLISHER_LABELS } from '@pioneer/rules/sdk';

/** One registered book as the Legal page lists it: message keys for its title, publisher and licence. */
export interface LegalBook {
  readonly id: BookId;
  readonly titleKey: BookLabel;
  readonly publisherKey: BookLabel;
  readonly licenseKey: BookLabel;
}

/** Every book in the registry, in registry order. */
export const LEGAL_BOOKS: readonly LegalBook[] = bookRegistry.books.map((book) => ({
  id: book.id,
  titleKey: bookTitle(book.id),
  publisherKey: PUBLISHER_LABELS[book.publisher],
  licenseKey: LICENSE_LABELS[book.license],
}));
