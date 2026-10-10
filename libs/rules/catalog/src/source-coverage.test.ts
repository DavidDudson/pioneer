import { describe, expect, test } from 'bun:test';

import { BookId, ContentKey, PackId, Slug, SourceKind, SourceRef } from '@pioneer/rules/sdk';

import { bookRegistry } from './book-registry';
import type { SourcedEntry } from './source-check';
import { sourceCoverage } from './source-coverage';

const AON = 'https://2e.aonprd.com/Feats.aspx?ID=1';

function entry(slug: string, ...sources: readonly Record<string, unknown>[]): SourcedEntry {
  return {
    pack: PackId.parse('player-core'),
    slug: Slug.parse(slug),
    sources: sources.map((source) => SourceRef.parse(source)),
  };
}

describe('source coverage', () => {
  test('lists, per registered book, the entries cited by AoN link alone', () => {
    const entries = [
      entry('toughness', { kind: SourceKind.Book, book: 'player-core', aon: AON }),
      entry('assurance', { kind: SourceKind.Book, book: 'player-core', page: 1 }),
      entry('fleet', { kind: SourceKind.Book, book: 'player-core', aon: AON }),
      entry('blast', { kind: SourceKind.Book, book: 'gm-core', page: 2, aon: AON }),
    ];
    const coverage = sourceCoverage(entries, bookRegistry);

    expect(coverage.map((book) => book.book)).toStrictEqual(bookRegistry.books.map((book) => book.id));
    expect(coverage.find((book) => book.book === BookId.parse('player-core'))).toStrictEqual({
      book: BookId.parse('player-core'),
      cited: 3,
      missingPage: ['player-core/fleet', 'player-core/toughness'].map((key) => ContentKey.parse(key)),
    });
    expect(coverage.find((book) => book.book === BookId.parse('gm-core'))).toStrictEqual({
      book: BookId.parse('gm-core'),
      cited: 1,
      missingPage: [],
    });
  });
});
