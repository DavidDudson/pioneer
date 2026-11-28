import { describe, expect, test } from 'bun:test';

import { ContentEntry, contentId, ContentKey, EntrySlug, PackId } from '@pioneer/rules/sdk';
import type { JsonObject, JsonValue } from '@pioneer/rules/sdk/testing';

import { prerequisiteCoverage } from './prerequisite-coverage';

const PACK = 'player-core';
const prose = (words: string): Array<JsonValue> => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** A Player Core feat with `data` beyond its category. */
function feat(name: string, data: JsonObject = {}): ContentEntry {
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
      feat('mature-companion', {
        prerequisites: prose('an animal companion'),
        prerequisitePredicate: ['self:companion:animal-companion'],
      }),
      feat('follower', { prerequisites: prose('a construct companion') }),
      feat('acrobat', { prerequisites: prose('a familiar'), prerequisitePredicate: ['self:companion:familiar'] }),
      feat('toughness'),
    ];

    expect(prerequisiteCoverage(entries)).toStrictEqual({
      withPrerequisites: 4,
      withoutPredicate: [ContentKey.parse('player-core/feat:follower')],
    });
  });

  test('an empty pack has nothing to cover', () => {
    expect(prerequisiteCoverage([])).toStrictEqual({ withPrerequisites: 0, withoutPredicate: [] });
  });
});
