import { describe, expect, test } from 'bun:test';

import { ContentEntry, contentId, ContentKey, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { prerequisiteCoverage } from './prerequisite-coverage';

const PACK = 'player-core';
const prose = (words: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** A Player Core feat with `data` beyond its category. */
function feat(name: string, data: object = {}): ContentEntry {
  const slug = `feat:${name}`;
  return ContentEntry.parse({
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    pack: PACK,
    slug,
    name,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    kind: 'feat',
    level: 1,
    data: { category: 'general', ...data },
  });
}

describe('prerequisite coverage', () => {
  test('counts feats with prerequisites and lists those without a predicate', () => {
    const entries = [
      feat('shield-warden', { prerequisites: prose('Shield Block'), prerequisitePredicate: ['feat:shield-block'] }),
      feat('mature-companion', { prerequisites: prose('an animal companion') }),
      feat('acrobat', { prerequisites: prose('a familiar') }),
      feat('toughness'),
    ];

    expect(prerequisiteCoverage(entries)).toStrictEqual({
      withPrerequisites: 3,
      withoutPredicate: ['player-core/feat:acrobat', 'player-core/feat:mature-companion'].map((key) =>
        ContentKey.parse(key),
      ),
    });
  });

  test('an empty pack has nothing to cover', () => {
    expect(prerequisiteCoverage([])).toStrictEqual({ withPrerequisites: 0, withoutPredicate: [] });
  });
});
