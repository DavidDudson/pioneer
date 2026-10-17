import {
  ItemFixture,
  itemFixtureId,
  itemFixtureRegistry,
  RuneFixture,
  runeFixtureId,
} from '@pioneer/character/domain/testing';
import { ContentKind, ContentSearchResult } from '@pioneer/rules/sdk';
import type { ContentId, ContentSearchQuery } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { keyItemContentSearch } from './key-item-content-search';
import type { ContentFinder } from './key-item-content-search';

/** A finder, and the queries it was asked. */
interface Finding {
  readonly finder: ContentFinder;
  readonly asked: ContentSearchQuery[];
}

/** A finder whose server search finds `ids`, and which records the queries it was asked. */
function finding(ids: readonly ContentId[]): Finding {
  const asked: ContentSearchQuery[] = [];
  const finder: ContentFinder = {
    search: async (query) => {
      asked.push(query);
      return ContentSearchResult.parse({ ids, total: ids.length });
    },
    registry: async () => itemFixtureRegistry(),
  };
  return { finder, asked };
}

describe('the key item content search', () => {
  it('names the items the server finds, in its order', async () => {
    const { finder } = finding([itemFixtureId(ItemFixture.Longsword), itemFixtureId(ItemFixture.Rope)]);

    const found = await keyItemContentSearch(finder).items('sword');

    expect(found.map(({ name }) => name)).toStrictEqual(['Longsword', 'Rope']);
  });

  it('names the runes the server finds', async () => {
    const { finder } = finding([runeFixtureId(RuneFixture.Flaming)]);

    const found = await keyItemContentSearch(finder).runes('flam');

    expect(found.map(({ name }) => name)).toStrictEqual(['Flaming']);
  });

  it('asks the server for runes among runes, and items among what a character carries', async () => {
    const { finder, asked } = finding([]);
    const search = keyItemContentSearch(finder);

    await search.runes('flam');
    await search.items('sword');

    expect(asked.map(({ kinds }) => kinds)).toStrictEqual([
      [ContentKind.Rune],
      expect.arrayContaining([ContentKind.Weapon, ContentKind.Armor]),
    ]);
  });

  it('leaves out a match no loaded content names, and asks nothing for blank words', async () => {
    const { finder, asked } = finding([itemFixtureId(ItemFixture.Longsword), runeFixtureId(RuneFixture.Flaming)]);
    const search = keyItemContentSearch(finder);

    const found = await search.items('sword');
    const blank = await search.items('   ');

    expect(found.map(({ name }) => name)).toStrictEqual(['Longsword']);
    expect(blank).toStrictEqual([]);
    expect(asked).toHaveLength(1);
  });
});
