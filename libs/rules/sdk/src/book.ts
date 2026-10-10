import type { ValueOf } from '@pioneer/shared/kernel';
import { issueParams, message, PlainDateCodec } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { ContentLicense, ContentLicenseSchema } from './license';
import { RulesMessage } from './messages';
import { BookId } from './source-ref';

/** Who published a book. Only Paizo for now; third-party books join as they are imported. */
export const Publisher = { Paizo: 'paizo' } as const;
export type Publisher = ValueOf<typeof Publisher>;

/** A message key naming a book, a publisher or a licence. */
export const BookLabel = z.string().brand<'BookLabel'>();
export type BookLabel = z.infer<typeof BookLabel>;

/**
 * Each registered book's title, as a message key (ADR-0009): titles are translated like any other text, so the
 * registry stores none. A book without an entry here fails registry validation.
 */
export const BOOK_TITLES: ReadonlyMap<BookId, BookLabel> = new Map([
  [BookId.parse('player-core'), BookLabel.parse('rules.book.title.playerCore')],
  [BookId.parse('player-core-2'), BookLabel.parse('rules.book.title.playerCore2')],
  [BookId.parse('gm-core'), BookLabel.parse('rules.book.title.gmCore')],
  [BookId.parse('monster-core'), BookLabel.parse('rules.book.title.monsterCore')],
]);

export const PUBLISHER_LABELS: Readonly<Record<Publisher, BookLabel>> = {
  [Publisher.Paizo]: BookLabel.parse('rules.book.publisher.paizo'),
};

export const LICENSE_LABELS: Readonly<Record<ContentLicense, BookLabel>> = {
  [ContentLicense.Orc]: BookLabel.parse('rules.book.license.orc'),
  [ContentLicense.PaizoCommunityUse]: BookLabel.parse('rules.book.license.paizoCup'),
  [ContentLicense.Homebrew]: BookLabel.parse('rules.book.license.homebrew'),
};

/** A book's own page on AoN, under Sources: `https://2e.aonprd.com/Sources.aspx?ID=216`. */
const AON_SOURCE = /^https:\/\/2e\.aonprd\.com\/Sources\.aspx\?ID=\d+$/u;
const URL_LENGTH_MAX = 2048;

export const AonSourceUrl = z
  .string()
  .max(URL_LENGTH_MAX)
  .refine((value) => AON_SOURCE.test(value), issueParams(message(RulesMessage.BookAonSourceUrl)))
  .brand<'AonSourceUrl'>();
export type AonSourceUrl = z.infer<typeof AonSourceUrl>;

/** One published book in the registry (content-model.md, "Books and source references"; ADR-0024). */
export const Book = z.strictObject({
  id: BookId,
  publisher: z.enum(Publisher),
  license: ContentLicenseSchema,
  remaster: z.boolean(),
  released: PlainDateCodec.optional(),
  aonSourceUrl: AonSourceUrl.optional(),
});
export type Book = z.infer<typeof Book>;

const BOOKS_MAX = 512;

/** The whole registry: each book once, and each with a title key in `BOOK_TITLES`. */
export const Books = z
  .array(Book)
  .max(BOOKS_MAX)
  .readonly()
  .check((context) => {
    const seen = new Set<BookId>();
    for (const [index, { id }] of context.value.entries()) {
      if (seen.has(id)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'id'],
          ...issueParams(message(RulesMessage.ListDuplicate, { value: id })),
        });
      }
      if (!BOOK_TITLES.has(id)) {
        context.issues.push({
          code: 'custom',
          input: context.value,
          path: [index, 'id'],
          ...issueParams(message(RulesMessage.BookUntitled, { book: id })),
        });
      }
      seen.add(id);
    }
  });
export type Books = z.infer<typeof Books>;

/** The title key of a book. Registry validation guarantees every registered book has one. */
export function bookTitle(id: BookId): BookLabel {
  const title = BOOK_TITLES.get(id);
  if (title === undefined) {
    throw new Error(`${id} has no title key`);
  }
  return title;
}
