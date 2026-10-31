import { describe, expect, test } from 'bun:test';

import { prerequisiteMatches } from '@pioneer/rules/catalog';
import { ContentEntryFile, contentId, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { enrichPrerequisiteFile } from './prerequisite-enrichment.ts';

const PACK = 'player-core';
const prose = (words: string): unknown[] => [{ type: 'paragraph', content: [{ type: 'text', text: words }] }];

/** A Player Core feat's JSON, as a pack file holds it. */
function feat(name: string, data: object = {}): object {
  const slug = `feat:${name.toLowerCase().replaceAll(' ', '-')}`;
  return {
    id: contentId(PackId.parse(PACK), EntrySlug.parse(slug)),
    pack: PACK,
    slug,
    kind: 'feat',
    name,
    level: 1,
    rarity: 'common',
    traits: [],
    sources: [{ kind: 'book', book: 'player-core', page: 1 }],
    description: [],
    rules: [],
    data: { category: 'general', ...data },
  };
}

/** The file after the pass, with matches read from its own entries. */
function enrich(file: readonly object[]): readonly unknown[] | undefined {
  const matches = prerequisiteMatches(ContentEntryFile.parse(file));
  return enrichPrerequisiteFile(file, new Map(matches.map((match) => [match.entry, match])));
}

const SHIELD_BLOCK = feat('Shield Block');

describe('prerequisite enrichment', () => {
  test('sets the predicate on matched feats', () => {
    const warden = feat('Shield Warden', { prerequisites: prose('Shield Block') });

    expect(enrich([SHIELD_BLOCK, warden])).toStrictEqual([
      SHIELD_BLOCK,
      feat('Shield Warden', { prerequisites: prose('Shield Block'), prerequisitePredicate: ['feat:shield-block'] }),
    ]);
  });

  test('sets each clause of a feat with several, parsed or not', () => {
    const prerequisites = prose('Shield Block; an animal companion');
    const warden = feat('Shield Warden', { prerequisites });

    expect(enrich([SHIELD_BLOCK, warden])).toStrictEqual([
      SHIELD_BLOCK,
      feat('Shield Warden', {
        prerequisites,
        prerequisiteClauses: [
          { text: 'Shield Block', predicate: ['feat:shield-block'] },
          { text: 'an animal companion', predicate: undefined },
        ],
      }),
    ]);
  });

  test('adds the clauses to a feat whose predicate was corrected, leaving the predicate', () => {
    const prerequisites = prose('Shield Block; Shield Block');
    const corrected = feat('Corrected', { prerequisites, prerequisitePredicate: ['feat:other'] });

    expect(enrich([SHIELD_BLOCK, corrected])).toStrictEqual([
      SHIELD_BLOCK,
      feat('Corrected', {
        prerequisites,
        prerequisitePredicate: ['feat:other'],
        prerequisiteClauses: [
          { text: 'Shield Block', predicate: ['feat:shield-block'] },
          { text: 'Shield Block', predicate: ['feat:shield-block'] },
        ],
      }),
    ]);
  });

  test('leaves a feat that already has its clauses', () => {
    const read = feat('Read', {
      prerequisites: prose('Shield Block; an animal companion'),
      prerequisiteClauses: [{ text: 'Shield Block' }, { text: 'an animal companion' }],
    });

    expect(enrich([SHIELD_BLOCK, read])).toBeUndefined();
  });

  test('leaves unmatched and corrected feats as they were', () => {
    const corrected = feat('Corrected', {
      prerequisites: prose('Shield Block'),
      prerequisitePredicate: ['feat:other'],
    });
    const unmatched = feat('Unmatched', { prerequisites: prose('an animal companion') });

    const enriched = enrich([
      SHIELD_BLOCK,
      corrected,
      unmatched,
      feat('Warden', { prerequisites: prose('Shield Block') }),
    ]);

    expect(enriched?.[1]).toBe(corrected);
    expect(enriched?.[2]).toBe(unmatched);
    expect(enrich([SHIELD_BLOCK, corrected, unmatched])).toBeUndefined();
  });
});
