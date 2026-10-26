import { describe, expect, test } from 'bun:test';

import { contentId, EnrichmentMapping, EntrySlug, PackId } from '@pioneer/rules/sdk';

import { enrichSourcesFile } from './source-enrichment.ts';

const PACK = 'player-core';
const AON = 'https://2e.aonprd.com/Spells.aspx?ID=1';
const OTHER_AON = 'https://2e.aonprd.com/Spells.aspx?ID=2';
const idOf = (slug: string): string => contentId(PackId.parse(PACK), EntrySlug.parse(slug));

/** A spell's JSON, as a pack file holds it, citing `sources`. */
function spell(slug: string, sources: readonly object[]): object {
  return {
    id: idOf(slug),
    pack: PACK,
    kind: 'spell',
    slug,
    name: slug,
    level: 1,
    rarity: 'common',
    traits: [],
    sources,
    description: [],
    rules: [],
    data: {
      rank: 1,
      time: { type: 'actions', cost: 'two' },
      range: { type: 'feet', feet: 30 },
      duration: { type: 'unlimited' },
      traditions: ['divine'],
      damage: [],
    },
  };
}

const book = (id: string, fields: object = {}): object => ({ kind: 'book', book: id, ...fields });
const mappings = (entries: Record<string, object>): ReadonlyMap<EntrySlug, EnrichmentMapping> =>
  new Map(Object.entries(entries).map(([slug, json]) => [EntrySlug.parse(slug), EnrichmentMapping.parse(json)]));

const HEAL = 'spell:heal';
const FIRE = 'spell:fire';

describe('enrichSourcesFile', () => {
  test('sets the page and AoN URL on the source for the mapped book and leaves the other sources alone', () => {
    const other = book('gm-core', { page: 9 });
    const file = [spell(HEAL, [other, book(PACK)]), spell(FIRE, [book(PACK)])];
    const result = enrichSourcesFile(file, mappings({ [HEAL]: { book: PACK, page: 4, aon: AON } }));
    expect(result).toMatchObject({ pages: 1, aons: 1, uncited: [] });
    expect(result.json?.[0]).toMatchObject({ sources: [other, book(PACK, { page: 4, aon: AON })] });
    expect(result.json?.[1]).toBe(file[1]);
  });

  test('never replaces a value already set, and fills only the one that is missing', () => {
    const file = [spell(HEAL, [book(PACK, { page: 7 })]), spell(FIRE, [book(PACK, { page: 7, aon: OTHER_AON })])];
    const result = enrichSourcesFile(
      file,
      mappings({ [HEAL]: { book: PACK, page: 4, aon: AON }, [FIRE]: { book: PACK, page: 4, aon: AON } }),
    );
    expect(result).toMatchObject({ pages: 0, aons: 1 });
    expect(result.json?.[0]).toMatchObject({ sources: [book(PACK, { page: 7, aon: AON })] });
    expect(result.json?.[1]).toBe(file[1]);
  });

  test('changes nothing when every mapped value is already set', () => {
    const set = book(PACK, { page: 4, aon: AON });
    const result = enrichSourcesFile([spell(HEAL, [set])], mappings({ [HEAL]: { book: PACK, page: 4, aon: AON } }));
    expect(result).toMatchObject({ json: undefined, pages: 0, aons: 0 });
  });

  test('reports a mapping whose book the entry does not cite, and applies nothing', () => {
    const result = enrichSourcesFile([spell(HEAL, [book('gm-core')])], mappings({ [HEAL]: { book: PACK, page: 4 } }));
    expect(result).toMatchObject({ json: undefined, pages: 0, uncited: [HEAL] });
  });
});
