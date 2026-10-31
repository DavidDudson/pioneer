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
      [
        'advanced-players-guide',
        'bastion-of-blasphemies',
        'battlecry',
        'character-guide',
        'cheliax-infernal-inheritance',
        'claws-of-the-tyrant',
        'clockwork-mystery',
        'core-rulebook',
        'curtain-call',
        'dark-archive-remastered',
        'divine-mysteries',
        'draconic-codex',
        'foolish-housekeeping',
        'gatewalkers',
        'gm-core',
        'guns-and-gears',
        'hellbreakers',
        'hellfire-dispatches',
        'hells-destiny',
        'high-seas',
        'howl-of-the-wild',
        'impossible-lands',
        'impossible-magic',
        'monster-core',
        'monster-core-2',
        'mwangi-expanse',
        'myth-speakers',
        'npc-core',
        'player-core',
        'player-core-2',
        'prey-for-death',
        'rage-of-elements',
        'revenge-of-the-runelords',
        'rival-academies',
        'season-of-ghosts',
        'secrets-of-magic',
        'secrets-of-the-unlit-star',
        'shades-of-blood',
        'shining-kingdoms',
        'spore-war',
        'the-dead-gods-hand',
        'the-show-must-go-on',
        'tian-xia-character-guide',
        'tian-xia-world-guide',
        'treasure-vault',
        'triumph-of-the-tusk',
        'troubles-in-grayce',
        'war-of-immortals',
        'wardens-of-wildwood',
      ].map((id) => BookId.parse(id)),
    );
  });

  test('every registered book has a title key and its AoN Sources page', () => {
    for (const book of bookRegistry.books) {
      expect(BOOK_TITLES.has(book.id)).toBe(true);
      expect(book.aonSourceUrl).toBeDefined();
    }
  });

  test('looks a book up by id, with its release as a date', () => {
    const book = bookRegistry.book(PLAYER_CORE);
    expect(book?.license).toBe(ContentLicense.Orc);
    expect(book?.released?.equals(Temporal.PlainDate.from('2023-11-15'))).toBe(true);
    expect(bookRegistry.book(BookId.parse('bestiary'))).toBeUndefined();
  });

  test('rejects a book listed twice', () => {
    expect(registryIssues([playerCore(), playerCore()])).toStrictEqual([
      {
        path: [1, 'id'],
        message: message(RulesMessage.ListDuplicate, { value: 'player-core' }),
      },
    ]);
  });

  test('rejects a book without a title key', () => {
    expect(registryIssues([playerCore({ id: 'bestiary' })])).toStrictEqual([
      {
        path: [0, 'id'],
        message: message(RulesMessage.BookUntitled, {
          book: 'bestiary',
        }),
      },
    ]);
  });

  test.each(['https://2e.aonprd.com/Sources.aspx', 'https://2e.aonprd.com/Feats.aspx?ID=1'])(
    'rejects %s: a book links one page under AoN Sources',
    (aonSourceUrl) => {
      expect(registryIssues([playerCore({ aonSourceUrl })])).toStrictEqual([
        {
          path: [0, 'aonSourceUrl'],
          message: message(RulesMessage.BookAonSourceUrl),
        },
      ]);
    },
  );

  test('every registered book round-trips through the wire schema', () => {
    for (const book of bookRegistry.books) {
      expect(Book.parse(z.encode(Book, book))).toStrictEqual(book);
    }
  });
});
