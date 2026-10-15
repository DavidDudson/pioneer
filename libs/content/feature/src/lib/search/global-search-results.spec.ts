import { ContentId, ContentKind } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { mergeBelow, nameMatches } from './global-search-results';

const BUILDER = new ContentPackBuilder().withId('search-test');
const PACK = BUILDER.withFeat('power-attack', { level: 1, traits: [] })
  .withFeat('attack-of-opportunity', { level: 1, traits: [] })
  .withFeat('sudden-charge', { level: 1, traits: [] })
  .withFeat('attack', { level: 1, traits: [] })
  .build();
const ENTRIES: readonly ContentEntry[] = PACK.otherEntries;
const compare = (left: string, right: string): number => left.localeCompare(right);
const namesOf = (entries: readonly ContentEntry[]): string[] => entries.map((entry) => entry.name);
const id = (slug: string): ContentId => ContentId.parse(BUILDER.idOf(ContentKind.Feat, slug));

describe(nameMatches, () => {
  it('ranks an exact name, then a prefix, then a word prefix, then a substring', () => {
    expect(namesOf(nameMatches(ENTRIES, 'attack', compare))).toStrictEqual([
      'Attack',
      'Attack-of-opportunity',
      'Power-attack',
    ]);
    expect(namesOf(nameMatches(ENTRIES, 'tack', compare))).toStrictEqual([
      'Attack',
      'Attack-of-opportunity',
      'Power-attack',
    ]);
  });

  it('ignores case and surrounding blanks', () => {
    expect(namesOf(nameMatches(ENTRIES, '  SUDDEN ', compare))).toStrictEqual(['Sudden-charge']);
  });

  it('matches nothing for blank words', () => {
    expect(nameMatches(ENTRIES, '   ', compare)).toStrictEqual([]);
  });
});

describe(mergeBelow, () => {
  it('keeps what is shown in place and adds the new ids below', () => {
    const merged = mergeBelow([id('a'), id('b')], [id('c'), id('a'), id('d')]);
    expect(merged).toStrictEqual([id('a'), id('b'), id('c'), id('d')]);
  });

  it('adds an id once', () => {
    expect(mergeBelow([], [id('a'), id('a')])).toStrictEqual([id('a')]);
  });
});
