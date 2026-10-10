import { describe, expect, test } from 'bun:test';

import { FEAT_FACETS } from './action-facets';
import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { ContentKind } from './content-kind';
import { COMMON_FACETS, FacetId, FacetType, facetValues, FacetValue, RangeBound, UNKNOWN } from './facet';
import type { FacetDefinition } from './facet';
import { EntryCount, facetCounts, filterEntries, onlyValue, SelectionKind } from './facet-filter';
import type { FacetCounts, FacetSelection, FilterState } from './facet-filter';
import { filterFromQuery, filterToQuery } from './filter-query';
import type { FilterQuery } from './filter-query';
import { facetsFor } from './kind-facets';
import { SPELL_FACETS } from './spell-facets';

const description = [{ type: 'paragraph', content: [{ type: 'text', text: 'A trait.' }] }];

interface EntryShape {
  readonly slug: string;
  readonly level?: number;
  readonly rarity?: string;
  readonly traits?: readonly string[];
  readonly books?: readonly string[];
  readonly pack?: string;
}

/** A trait entry: the smallest kind, so the envelope is all there is to filter on. */
function entry({
  slug,
  level,
  rarity = 'common',
  traits = [],
  books = ['player-core'],
  pack = 'player-core',
}: EntryShape): ContentEntry {
  return ContentEntry.parse({
    id: contentId(PackId.parse(pack), Slug.parse(slug)),
    pack,
    kind: ContentKind.Trait,
    slug,
    name: slug,
    ...(level === undefined ? {} : { level }),
    rarity,
    traits,
    sources: books.map((book) => ({ kind: 'book', book, page: 1 })),
    description,
    rules: [],
    data: { appliesTo: [] },
  });
}

function facet(id: string): FacetDefinition {
  const found = COMMON_FACETS.find((candidate) => candidate.id === id);
  if (found === undefined) {
    throw new Error(`No facet ${id}`);
  }
  return found;
}

const values = (...texts: string[]): FacetValue[] => texts.map((text) => FacetValue.parse(text));
const slugs = (entries: readonly ContentEntry[]): readonly string[] => entries.map((each) => each.slug);
const include = (...texts: string[]): FacetSelection => ({
  kind: SelectionKind.Values,
  include: values(...texts),
  exclude: [],
});
const exclude = (...texts: string[]): FacetSelection => ({
  kind: SelectionKind.Values,
  include: [],
  exclude: values(...texts),
});
const state = (selections: Record<string, FacetSelection>): FilterState =>
  new Map(Object.entries(selections).map(([id, selection]) => [FacetId.parse(id), selection]));

/** A facet's counts as plain pairs. */
function pairs(counts: readonly FacetCounts[], id: string): (readonly [string, number])[] {
  const found = counts.find((each) => each.facet.id === id);
  return (found?.values ?? []).map(({ value, count }) => [value, count]);
}

const plainQuery = (query: FilterQuery): Record<string, string> => ({ ...query });

const fire = entry({ slug: 'fire', level: 1, traits: ['fire', 'evocation'] });
const cold = entry({ slug: 'cold', level: 3, rarity: 'uncommon', traits: ['cold'] });
const acid = entry({ slug: 'acid', level: 5, rarity: 'rare', traits: ['acid', 'fire'], books: ['gm-core'] });
const plain = entry({ slug: 'plain', traits: [], pack: 'homebrew' });
const ENTRIES = [fire, cold, acid, plain];

/** The slugs of the entries `selections` keep, over `ENTRIES`. */
function kept(selections: Record<string, FacetSelection>, facets = COMMON_FACETS): readonly string[] {
  return slugs(filterEntries(ENTRIES, facets, state(selections)));
}

describe('facet values', () => {
  test('reads a field, each value once', () => {
    expect(facetValues(fire, facet('traits'))).toStrictEqual(values('fire', 'evocation'));
    expect(facetValues(cold, facet('rarity'))).toStrictEqual(values('uncommon'));
    expect(facetValues(fire, facet('level'))).toStrictEqual(values('1'));
  });

  test('reads through arrays, so every source gives its book', () => {
    const twoBooks = entry({ slug: 'two', books: ['player-core', 'gm-core', 'player-core'] });
    expect(facetValues(twoBooks, facet('book'))).toStrictEqual(values('player-core', 'gm-core'));
  });

  test('a missing field is unknown, an empty list is no values', () => {
    expect(facetValues(plain, facet('level'))).toStrictEqual([UNKNOWN]);
    expect(facetValues(plain, facet('traits'))).toStrictEqual([]);
  });

  test('a flag reads a boolean as yes or no', () => {
    const flag: FacetDefinition = {
      id: FacetId.parse('stub'),
      type: FacetType.Flag,
      label: facet('rarity').label,
      path: ['data', 'flag'],
    };
    const withFlag = { ...fire, data: { flag: true } } as unknown as ContentEntry;
    expect(facetValues(withFlag, flag)).toStrictEqual(values('yes'));
    expect(facetValues(fire, flag)).toStrictEqual([UNKNOWN]);
  });

  test('every kind has the common facets, then its own', () => {
    const common = COMMON_FACETS.map((each) => each.id);
    expect(facetsFor([ContentKind.Trait]).map((each) => each.id)).toStrictEqual(common);
    expect(facetsFor([ContentKind.Spell, ContentKind.Feat]).map((each) => each.id)).toStrictEqual([
      ...common,
      ...SPELL_FACETS.map((each) => each.id),
      ...FEAT_FACETS.map((each) => each.id),
    ]);
  });
});

describe('filtering', () => {
  test('no selection keeps everything, in order', () => {
    expect(kept({})).toStrictEqual(['fire', 'cold', 'acid', 'plain']);
  });

  test('values in one facet combine with OR', () => {
    expect(kept({ rarity: include('uncommon', 'rare') })).toStrictEqual(['cold', 'acid']);
  });

  test('facets combine with AND', () => {
    expect(kept({ traits: include('fire'), rarity: include('common') })).toStrictEqual(['fire']);
  });

  test('an excluded value drops every entry that has it', () => {
    expect(kept({ traits: exclude('fire') })).toStrictEqual(['cold', 'plain']);
  });

  test('a range keeps values between its bounds and drops unknown ones', () => {
    const range: FacetSelection = { kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(3) };
    expect(kept({ level: range })).toStrictEqual(['fire', 'cold']);
  });

  test('the unknown value can be picked in a set facet', () => {
    const levelAsSet: FacetDefinition = { ...facet('level'), type: FacetType.Set };
    expect(kept({ level: include('_unknown') }, [levelAsSet])).toStrictEqual(['plain']);
  });
});

describe('counts', () => {
  test('each value counts what picking it alone would leave', () => {
    const counts = facetCounts(ENTRIES, COMMON_FACETS, state({ traits: include('cold') }));
    expect(pairs(counts, 'traits')).toStrictEqual([
      ['fire', 2],
      ['acid', 1],
      ['cold', 1],
      ['evocation', 1],
    ]);
    // Other facets count over what the traits pick leaves: just `cold`.
    expect(pairs(counts, 'rarity')).toStrictEqual([['uncommon', 1]]);
  });

  test('a range lists values in number order with unknown apart', () => {
    const level = facetCounts(ENTRIES, COMMON_FACETS, new Map()).find((each) => each.facet.id === 'level');
    expect(level?.values.map(({ value }) => String(value))).toStrictEqual(['1', '3', '5']);
    expect(level?.unknown).toBe(EntryCount.parse(1));
  });

  test('a selected value is listed even when nothing has it', () => {
    const counts = facetCounts(ENTRIES, COMMON_FACETS, state({ traits: exclude('sonic') }));
    expect(pairs(counts, 'traits')).toContainEqual(['sonic', 0]);
  });

  test('onlyValue leaves a range alone for the unknown value', () => {
    const before = state({ level: { kind: SelectionKind.Range, min: RangeBound.parse(1), max: undefined } });
    expect(onlyValue(before, facet('level'), UNKNOWN)).toBe(before);
  });

  test('onlyValue keeps the facet’s exclusions', () => {
    const picked = onlyValue(state({ traits: exclude('evocation') }), facet('traits'), FacetValue.parse('fire'));
    expect(slugs(filterEntries(ENTRIES, COMMON_FACETS, picked))).toStrictEqual(['acid']);
  });
});

describe('query params', () => {
  test('writes one param per narrowing facet, values sorted, exclusions marked', () => {
    const query = filterToQuery(
      state({
        traits: { kind: SelectionKind.Values, include: values('fire', 'cold'), exclude: values('evil') },
        level: { kind: SelectionKind.Range, min: RangeBound.parse(1), max: undefined },
        rarity: include(),
      }),
      COMMON_FACETS,
    );
    expect(plainQuery(query)).toStrictEqual({ 'f.level': '1..', 'f.traits': 'cold,fire,!evil' });
  });

  test('reads its own params back', () => {
    const read = filterFromQuery({ 'f.traits': 'fire,!evil', 'f.level': '..5', page: '2' }, COMMON_FACETS);
    expect(plainQuery(filterToQuery(read, COMMON_FACETS))).toStrictEqual({
      'f.level': '..5',
      'f.traits': 'fire,!evil',
    });
  });

  test('drops what does not read instead of failing', () => {
    const read = filterFromQuery(
      {
        'f.nope': 'x',
        'f.level': '1..two',
        'f.rarity': 'common,legendary,!rare',
        'f.traits': 'Fire,,ok,!ok',
        'f.pack': ['player-core', 'other'],
        'f.book': 3,
      },
      COMMON_FACETS,
    );
    expect(plainQuery(filterToQuery(read, COMMON_FACETS))).toStrictEqual({
      'f.rarity': 'common,!rare',
      'f.traits': '!ok',
      'f.pack': 'player-core',
    });
  });
});
