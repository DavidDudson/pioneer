import { describe, expect, test } from 'bun:test';

import { BookId, PackId, RulesMessage, Slug, SourceKind, SourceRef } from '@pioneer/rules/sdk';
import { slugText } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';
import { assert, constantFrom, integer, property, record } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { bookRegistry } from './book-registry';
import { sourceIssues } from './source-check';
import type { SourcedEntry } from './source-check';

const PAGE_MAX = 999;

const registered: Arbitrary<string> = constantFrom(...bookRegistry.books.map((book) => book.id));
const unregistered: Arbitrary<string> = slugText.filter((slug) => bookRegistry.book(BookId.parse(slug)) === undefined);

/** An entry citing one book page, as generated. */
interface Citation {
  readonly pack: string;
  readonly slug: string;
  readonly book: string;
  readonly page: number;
}

function citing(books: Arbitrary<string>): Arbitrary<Citation> {
  return record({ pack: slugText, slug: slugText, book: books, page: integer({ min: 1, max: PAGE_MAX }) });
}

function entry({ pack, slug, book, page }: Citation): SourcedEntry {
  return {
    pack: PackId.parse(pack),
    slug: Slug.parse(slug),
    sources: [SourceRef.parse({ kind: SourceKind.Book, book, page })],
  };
}

describe('source checks (properties)', () => {
  test('a source in a registered book always passes', () => {
    assert(
      property(citing(registered), (citation) => {
        expect(sourceIssues(entry(citation), bookRegistry)).toStrictEqual([]);
      }),
    );
  });

  test('a source in an unregistered book always fails, naming it', () => {
    assert(
      property(citing(unregistered), (citation) => {
        const { pack, slug, book } = citation;
        expect(sourceIssues(entry(citation), bookRegistry)).toStrictEqual([
          {
            path: ['sources', 0, 'book'],
            message: message(RulesMessage.SourceUnknownBook, { entry: `${pack}/${slug}`, index: 0, book }),
          },
        ]);
      }),
    );
  });
});
