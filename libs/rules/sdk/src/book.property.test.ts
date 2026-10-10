import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, Temporal } from '@pioneer/shared/kernel';
import { assert, boolean, constantFrom, integer, property, record, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';
import * as z from 'zod';

import { Book, BOOK_TITLES, Books, Publisher } from './book';
import { ContentLicense } from './license';
import { RulesMessage } from './messages';

const AON_SOURCE_ID_MAX = 9999;
const EARLIEST = Temporal.PlainDate.from('2019-01-01');
const RELEASE_SPAN_DAYS = 4000;

const titledId: Arbitrary<string> = constantFrom(...BOOK_TITLES.keys());

const bookJson: Arbitrary<z.input<typeof Book>> = record(
  {
    id: titledId,
    publisher: constantFrom(...Object.values(Publisher)),
    license: constantFrom(...Object.values(ContentLicense)),
    remaster: boolean(),
    released: integer({ min: 0, max: RELEASE_SPAN_DAYS }).map((days) => EARLIEST.add({ days }).toString()),
    aonSourceUrl: integer({ min: 1, max: AON_SOURCE_ID_MAX }).map(
      (id) => `https://2e.aonprd.com/Sources.aspx?ID=${id}`,
    ),
  },
  { requiredKeys: ['id', 'publisher', 'license', 'remaster'] },
);

describe('books (properties)', () => {
  test('a book with a title key round-trips', () => {
    assert(
      property(bookJson, (json) => {
        const parsed = Book.parse(json);
        expect(Book.parse(z.encode(Book, parsed))).toStrictEqual(parsed);
      }),
    );
  });

  test('a registry of distinct titled books is valid', () => {
    assert(
      property(uniqueArray(bookJson, { selector: (book) => book.id }), (books) => {
        expect(Books.safeParse(books).success).toBe(true);
      }),
    );
  });

  test('a book listed twice is always reported at its second listing', () => {
    assert(
      property(bookJson, (json) => {
        const result = Books.safeParse([json, json]);
        expect(result.success ? [] : fieldIssues(result.error.issues)).toStrictEqual([
          { path: [1, 'id'], message: message(RulesMessage.ListDuplicate, { value: json.id }) },
        ]);
      }),
    );
  });
});
