import { describe, expect, test } from 'bun:test';

import {
  ContentLicense,
  ContentPack,
  contentId,
  contentPackFromFiles,
  PackId,
  RulesMessage,
  Slug,
  SourceKind,
  SourceRef,
} from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { message } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import type * as z from 'zod';

import { bookRegistry } from './book-registry';
import { checkPackSources, SourceCheckError, sourceIssues } from './source-check';
import type { SourcedEntry } from './source-check';

const AUTHOR = '00000000-0000-4000-8000-000000000002';

/** The issues with `homebrew/sanity` citing `sources`. */
function issuesCiting(...sources: readonly z.input<typeof SourceRef>[]): readonly FieldIssue[] {
  const entry: SourcedEntry = {
    pack: PackId.parse('homebrew'),
    slug: Slug.parse('sanity'),
    sources: sources.map((source) => SourceRef.parse(source)),
  };
  return sourceIssues(entry, bookRegistry);
}

function book(id: string): z.input<typeof SourceRef> {
  return { kind: SourceKind.Book, book: id, page: 1 };
}

function homebrew(pack: string): z.input<typeof SourceRef> {
  return { kind: SourceKind.Homebrew, author: AUTHOR, pack };
}

/** The entries `checkPackSources` rejects in `pack`. */
function rejected(pack: ContentPack): readonly string[] {
  try {
    checkPackSources(pack, bookRegistry);
    return [];
  } catch (error) {
    if (error instanceof SourceCheckError) {
      return error.entries.map((missourced) => missourced.entry);
    }
    throw error;
  }
}

describe('source checks', () => {
  test('a registered book, a web page and the own pack as homebrew all pass', () => {
    const web = { kind: SourceKind.Web, url: 'https://example.com/sanity' } as const;
    expect(issuesCiting(book('player-core'), web, homebrew('homebrew'))).toStrictEqual([]);
  });

  test('names the entry, the source and the book that is not registered', () => {
    expect(issuesCiting(book('player-core'), book('core-rulebook'))).toStrictEqual([
      {
        path: ['sources', 1, 'book'],
        message: message(RulesMessage.SourceUnknownBook, {
          entry: 'homebrew/sanity',
          index: 1,
          book: 'core-rulebook',
        }),
      },
    ]);
  });

  test('rejects a homebrew source from another pack', () => {
    expect(issuesCiting(homebrew('someone-else'))).toStrictEqual([
      {
        path: ['sources', 0, 'pack'],
        message: message(RulesMessage.SourceHomebrewPack, {
          entry: 'homebrew/sanity',
          index: 0,
          pack: 'homebrew',
          sourcePack: 'someone-else',
        }),
      },
    ]);
  });

  test('a pack whose entries pass is returned as is', () => {
    const pack = new ContentPackBuilder().withId('homebrew').withStatistic('sanity').build();
    expect(checkPackSources(pack, bookRegistry)).toBe(pack);
  });

  test('a wrongly sourced pack fails with every rejected entry', () => {
    const pack = new ContentPackBuilder()
      .withId('homebrew')
      .withAncestry('lizardfolk', { sources: [book('core-rulebook')] })
      .withStatistic('sanity', { sources: [homebrew('someone-else')] })
      .withStatistic('luck')
      .build();
    expect(rejected(pack)).toStrictEqual(['homebrew/lizardfolk', 'homebrew/sanity']);
  });

  test('checks variant rules too', () => {
    const pack = ContentPack.define({
      manifest: { id: 'homebrew', title: 'Homebrew', publisher: 'Tests', license: ContentLicense.Homebrew },
      ancestries: [],
      creatures: [],
      variantRules: [{ slug: 'gritty', name: 'Gritty', sources: [book('core-rulebook')], rules: [] }],
    });
    expect(rejected(pack)).toStrictEqual(['homebrew/gritty']);
  });

  test('checks entries of kinds the registry does not hold yet', () => {
    const pack = contentPackFromFiles(
      { id: 'homebrew', title: 'Homebrew', publisher: 'Tests', license: ContentLicense.Homebrew },
      [
        [
          {
            id: contentId(PackId.parse('homebrew'), Slug.parse('lizard')),
            pack: 'homebrew',
            kind: 'language',
            slug: 'lizard',
            name: 'Lizard',
            rarity: 'common',
            traits: [],
            sources: [book('core-rulebook')],
            description: [],
            rules: [],
            data: {},
          },
        ],
      ],
    );
    expect(rejected(pack)).toStrictEqual(['homebrew/lizard']);
  });
});
