import { describe, expect, test } from 'bun:test';

import { Book, BOOK_TITLES, BookId, ContentLicense, Publisher, RulesMessage } from '@pioneer/rules/sdk';
import { fieldIssues, message, Temporal } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { BookRegistry, bookRegistry } from './book-registry';

const PLAYER_CORE = BookId.parse('player-core');

function playerCore(overrides: Readonly<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    id: 'player-core',
    publisher: Publisher.Paizo,
    license: ContentLicense.Orc,
    remaster: true,
    released: '2023-11-15',
    aonSourceUrl: 'https://2e.aonprd.com/Sources.aspx?ID=216',
    ...overrides,
  };
}

function registryIssues(input: unknown): readonly FieldIssue[] {
  try {
    BookRegistry.parse(input);
    return [];
  } catch (error) {
    if (error instanceof z.ZodError) {
      return fieldIssues(error.issues);
    }
    throw error;
  }
}

describe('book registry', () => {
  test('books.json validates and has the remaster core books', () => {
    expect(bookRegistry.books.map((book) => book.id).toSorted()).toStrictEqual(
      ['gm-core', 'monster-core', 'player-core', 'player-core-2'].map((id) => BookId.parse(id)),
    );
  });

  test('every registered book has a title key', () => {
    for (const book of bookRegistry.books) {
      expect(BOOK_TITLES.has(book.id)).toBe(true);
    }
  });

  test('looks a book up by id, with its release as a date', () => {
    const book = bookRegistry.book(PLAYER_CORE);
    expect(book?.license).toBe(ContentLicense.Orc);
    expect(book?.released?.equals(Temporal.PlainDate.from('2023-11-15'))).toBe(true);
    expect(bookRegistry.book(BookId.parse('core-rulebook'))).toBeUndefined();
  });

  test('rejects a book listed twice', () => {
    expect(registryIssues([playerCore(), playerCore()])).toStrictEqual([
      { path: [1, 'id'], message: message(RulesMessage.ListDuplicate, { value: 'player-core' }) },
    ]);
  });

  test('rejects a book without a title key', () => {
    expect(registryIssues([playerCore({ id: 'core-rulebook' })])).toStrictEqual([
      { path: [0, 'id'], message: message(RulesMessage.BookUntitled, { book: 'core-rulebook' }) },
    ]);
  });

  test('rejects an AoN Sources link that is not one entry', () => {
    expect(
      registryIssues([playerCore({ aonSourceUrl: 'https://2e.aonprd.com/Sources.aspx' })]).map((issue) => issue.path),
    ).toStrictEqual([[0, 'aonSourceUrl']]);
  });

  test('every registered book round-trips through the wire schema', () => {
    for (const book of bookRegistry.books) {
      expect(Book.parse(z.encode(Book, book))).toStrictEqual(book);
    }
  });
});
