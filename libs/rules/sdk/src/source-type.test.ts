import { describe, expect, test } from 'bun:test';

import { Book, ProductLine } from './book';
import { ContentLicense } from './license';
import { SourceRef } from './source-ref';
import { SourceType, sourceType } from './source-type';

const PLAYER_CORE = SourceRef.parse({ kind: 'book', book: 'player-core' });

function book(productLine: ProductLine | undefined, remaster: boolean): Book {
  return Book.parse({
    id: 'player-core',
    publisher: 'paizo',
    license: remaster ? ContentLicense.Orc : ContentLicense.Ogl,
    remaster,
    ...(productLine === undefined ? {} : { productLine }),
  });
}

const BOOK_CASES: readonly (readonly [ProductLine, SourceType, SourceType])[] = [
  [ProductLine.Rulebooks, SourceType.RulebookRemaster, SourceType.RulebookLegacy],
  [ProductLine.LostOmens, SourceType.LostOmensRemaster, SourceType.LostOmensLegacy],
  [ProductLine.AdventurePaths, SourceType.CampaignRemaster, SourceType.CampaignLegacy],
  [ProductLine.Adventures, SourceType.AdventureRemaster, SourceType.AdventureLegacy],
  [ProductLine.Society, SourceType.SocietyRemaster, SourceType.SocietyLegacy],
];

describe('source type', () => {
  test.each(BOOK_CASES)('types a %s book by edition', (line, remaster, legacy) => {
    expect(sourceType({ source: PLAYER_CORE, book: book(line, true), license: ContentLicense.Orc })).toBe(remaster);
    expect(sourceType({ source: PLAYER_CORE, book: book(line, false), license: ContentLicense.Ogl })).toBe(legacy);
  });

  test('types OGL content in a remaster book as legacy', () => {
    const type = sourceType({
      source: PLAYER_CORE,
      book: book(ProductLine.Rulebooks, true),
      license: ContentLicense.Ogl,
    });
    expect(type).toBe(SourceType.RulebookLegacy);
  });

  test.each([ProductLine.Comics, ProductLine.AprilFools, ProductLine.BlogPosts])('types %s as unknown', (line) => {
    expect(sourceType({ source: PLAYER_CORE, book: book(line, true), license: ContentLicense.Orc })).toBe(
      SourceType.Unknown,
    );
  });

  test('types a book with no product line as unknown', () => {
    expect(sourceType({ source: PLAYER_CORE, book: book(undefined, true), license: ContentLicense.Orc })).toBe(
      SourceType.Unknown,
    );
  });

  test('types a book the registry does not hold as unknown', () => {
    expect(sourceType({ source: PLAYER_CORE, book: undefined, license: ContentLicense.Orc })).toBe(SourceType.Unknown);
  });

  test('types a web source', () => {
    const source = SourceRef.parse({ kind: 'web', url: 'https://example.com/' });
    expect(sourceType({ source, book: undefined, license: ContentLicense.Homebrew })).toBe(SourceType.Web);
  });

  test('types a homebrew source', () => {
    const source = SourceRef.parse({
      kind: 'homebrew',
      author: '00000000-0000-4000-8000-000000000001',
      pack: 'mine',
    });
    expect(sourceType({ source, book: undefined, license: ContentLicense.Homebrew })).toBe(SourceType.Homebrew);
  });
});
