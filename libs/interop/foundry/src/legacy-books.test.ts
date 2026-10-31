import { describe, expect, test } from 'bun:test';

import { BookId, ContentLicense, LegacyImport, Publisher } from '@pioneer/rules/sdk';
import type { Book } from '@pioneer/rules/sdk';

import { legacyBooks } from './legacy-books';

const book = (id: string, overrides: Partial<Book> = {}): Book => ({
  id: BookId.parse(id),
  publisher: Publisher.Paizo,
  license: ContentLicense.Ogl,
  remaster: false,
  ...overrides,
});

describe('legacyBooks', () => {
  test('sorts the flagged books by how much of each is imported', () => {
    const { whole, listed } = legacyBooks([
      book('mwangi-expanse', { legacy: LegacyImport.Whole }),
      book('core-rulebook', { legacy: LegacyImport.Listed }),
    ]);

    expect([...whole]).toEqual([BookId.parse('mwangi-expanse')]);
    expect([...listed]).toEqual([BookId.parse('core-rulebook')]);
  });

  test('leaves out a legacy book the registry does not flag, and a remaster one', () => {
    const { whole, listed } = legacyBooks([
      book('secrets-of-magic'),
      book('player-core', { license: ContentLicense.Orc, remaster: true }),
    ]);

    expect(whole.size + listed.size).toBe(0);
  });
});
