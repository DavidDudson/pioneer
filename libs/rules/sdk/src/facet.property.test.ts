import { describe, expect, test } from 'bun:test';

import { array, assert, constantFrom, integer, option, property, record, subarray, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { ContentEntry } from './content-entry';
import { contentId, PackId, Slug } from './content-id';
import { ContentKind } from './content-kind';
import { Rarity } from './entry-fields';
import { COMMON_FACETS, FacetType, facetValues, FacetValue, RangeBound } from './facet';
import type { FacetDefinition, FacetId } from './facet';
import { facetCounts, filterEntries, onlyValue, SelectionKind } from './facet-filter';
import type { FacetSelection, FilterState } from './facet-filter';
import { filterFromQuery, filterToQuery } from './filter-query';

/** Small pools, so generated lists share values and filters have something to do. */
const TRAITS = ['fire', 'cold', 'evil', 'magical', 'rare-trait'];
const BOOKS = ['player-core', 'gm-core', 'monster-core'];
const PACKS = ['player-core', 'homebrew'];
const LEVEL_TOP = 6;
const ENTRIES_MAX = 12;
const description = [{ type: 'paragraph', content: [{ type: 'text', text: 'A trait.' }] }];

interface EntryShape {
  readonly level: number | undefined;
  readonly rarity: string;
  readonly traits: readonly string[];
  readonly books: readonly string[];
  readonly pack: string;
}

const shape: Arbitrary<EntryShape> = record({
  level: option(integer({ min: 0, max: LEVEL_TOP }), { nil: undefined }),
  rarity: constantFrom(...Object.values(Rarity)),
  traits: subarray(TRAITS),
  books: subarray(BOOKS, { minLength: 1 }),
  pack: constantFrom(...PACKS),
});

const entries: Arbitrary<readonly ContentEntry[]> = array(shape, { maxLength: ENTRIES_MAX }).map((shapes) =>
  shapes.map(({ level, rarity, traits, books, pack }, index) =>
    ContentEntry.parse({
      id: contentId(PackId.parse(pack), Slug.parse(`entry-${index}`)),
      pack,
      kind: ContentKind.Trait,
      slug: `entry-${index}`,
      name: `Entry ${index}`,
      ...(level === undefined ? {} : { level }),
      rarity,
      traits,
      sources: books.map((book) => ({ kind: 'book', book, page: 1 })),
      description,
      rules: [],
      data: { appliesTo: [] },
    }),
  ),
);

const POOLS: Readonly<Record<string, readonly string[]>> = {
  rarity: Object.values(Rarity),
  traits: [...TRAITS, '_unknown'],
  book: BOOKS,
  pack: PACKS,
};

const bound: Arbitrary<RangeBound | undefined> = option(
  integer({ min: 0, max: LEVEL_TOP }).map((value) => RangeBound.parse(value)),
  { nil: undefined },
);

/** A selection as `filterFromQuery` would give it back: sorted, disjoint, and narrowing. */
function selection(facet: FacetDefinition): Arbitrary<FacetSelection | undefined> {
  if (facet.type === FacetType.Range) {
    return tuple(bound, bound).map(([min, max]) =>
      min === undefined && max === undefined ? undefined : { kind: SelectionKind.Range, min, max },
    );
  }
  const pool = (POOLS[facet.id] ?? []).map((value) => FacetValue.parse(value));
  return tuple(subarray(pool), subarray(pool)).map(([picked, dropped]) => {
    const exclude = dropped.toSorted();
    const include = picked.filter((value) => !exclude.includes(value)).toSorted();
    return include.length === 0 && exclude.length === 0 ? undefined : { kind: SelectionKind.Values, include, exclude };
  });
}

const filterState: Arbitrary<FilterState> = tuple(...COMMON_FACETS.map((facet) => selection(facet))).map(
  (selections) =>
    new Map(
      selections.flatMap((picked, index): (readonly [FacetId, FacetSelection])[] => {
        const facet = COMMON_FACETS[index];
        return facet === undefined || picked === undefined ? [] : [[facet.id, picked]];
      }),
    ),
);

const facetIndex = integer({ min: 0, max: COMMON_FACETS.length - 1 });

describe('facet filters (properties)', () => {
  test("a value's count is the size of the list after picking only it", () => {
    assert(
      property(entries, filterState, (list, state) => {
        for (const counts of facetCounts(list, COMMON_FACETS, state)) {
          for (const { value, count } of counts.values) {
            expect(filterEntries(list, COMMON_FACETS, onlyValue(state, counts.facet, value))).toHaveLength(count);
          }
        }
      }),
    );
  });

  test('picking a value and excluding it split the list between them', () => {
    assert(
      property(entries, filterState, facetIndex, (list, state, index) => {
        const facet = COMMON_FACETS[index];
        if (facet === undefined || facet.type === FacetType.Range) {
          return;
        }
        const others = new Map(state);
        others.delete(facet.id);
        const base = filterEntries(list, COMMON_FACETS, others);
        for (const value of new Set(base.flatMap((each) => facetValues(each, facet)))) {
          const kept = filterEntries(list, COMMON_FACETS, new Map([...others, [facet.id, only(value)]]));
          const dropped = filterEntries(list, COMMON_FACETS, new Map([...others, [facet.id, without(value)]]));
          expect([...kept, ...dropped].map((each) => each.id).toSorted()).toStrictEqual(
            base.map((each) => each.id).toSorted(),
          );
        }
      }),
    );
  });

  test('filter state survives the URL', () => {
    assert(
      property(filterState, (state) => {
        expect(filterFromQuery(filterToQuery(state, COMMON_FACETS), COMMON_FACETS)).toStrictEqual(state);
      }),
    );
  });
});

function only(value: FacetValue): FacetSelection {
  return { kind: SelectionKind.Values, include: [value], exclude: [] };
}

function without(value: FacetValue): FacetSelection {
  return { kind: SelectionKind.Values, include: [], exclude: [value] };
}
