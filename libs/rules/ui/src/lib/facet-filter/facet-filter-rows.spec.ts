import { ContentKind, EntryCount, FacetId, facetsFor, FacetValue, RangeBound, SelectionKind } from '@pioneer/rules/sdk';
import type { FacetDefinition, FilterState } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { FacetRowKind, facetRows, RangeSide, withBound, withValues } from './facet-filter-rows';

const BULK_ID = FacetId.parse('bulk');

function bulkFacet(): FacetDefinition {
  const found = facetsFor([ContentKind.Weapon]).find((facet) => facet.id === BULK_ID);
  if (found === undefined) {
    throw new Error('No bulk facet');
  }
  return found;
}

describe(withBound, () => {
  it('stores a bound in the facet’s unit: bulk counts tenths', () => {
    const state = withBound(new Map(), bulkFacet(), { side: RangeSide.Max, shown: 1 });
    expect(state.get(BULK_ID)).toStrictEqual({ kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(10) });
  });

  it('drops the facet from the state once both bounds are open', () => {
    const bounded = withBound(new Map(), bulkFacet(), { side: RangeSide.Min, shown: 1 });
    expect(withBound(bounded, bulkFacet(), { side: RangeSide.Min, shown: undefined }).has(BULK_ID)).toBe(false);
  });
});

describe(withValues, () => {
  it('drops the facet once nothing is picked or excluded', () => {
    const facet = bulkFacet();
    const picked: FilterState = withValues(new Map(), facet, new Set([FacetValue.parse('1')]));
    expect(withValues(picked, facet, new Set()).has(BULK_ID)).toBe(false);
  });

  it('lifts the exclusion of a value once it is picked, keeping the rest excluded', () => {
    const facet = bulkFacet();
    const [one, two] = [FacetValue.parse('1'), FacetValue.parse('2')];
    const excluded: FilterState = new Map([
      [BULK_ID, { kind: SelectionKind.Values, include: [], exclude: [one, two] }],
    ]);
    expect(withValues(excluded, facet, new Set([one])).get(BULK_ID)).toStrictEqual({
      kind: SelectionKind.Values,
      include: [one],
      exclude: [two],
    });
  });
});

describe(facetRows, () => {
  it('keeps a bounded range with no values in the list, so it can be cleared, but gives it no span', () => {
    const counts = [{ facet: bulkFacet(), values: [], unknown: EntryCount.parse(0) }];
    const state: FilterState = new Map([
      [BULK_ID, { kind: SelectionKind.Range, min: RangeBound.parse(10), max: undefined }],
    ]);
    expect(facetRows(counts, state)).toStrictEqual([
      { kind: FacetRowKind.Range, facet: bulkFacet(), min: 1, max: undefined, span: undefined, step: 0.1 },
    ]);
  });

  it('shows a range’s bounds and values in the unit it is shown in', () => {
    const counts = [
      {
        facet: bulkFacet(),
        values: [
          { value: FacetValue.parse('1'), count: EntryCount.parse(2) },
          { value: FacetValue.parse('20'), count: EntryCount.parse(1) },
        ],
        unknown: EntryCount.parse(0),
      },
    ];
    const state: FilterState = new Map([
      [BULK_ID, { kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(10) }],
    ]);
    expect(facetRows(counts, state)).toStrictEqual([
      {
        kind: FacetRowKind.Range,
        facet: bulkFacet(),
        min: undefined,
        max: 1,
        span: { lowest: 0.1, highest: 2 },
        step: 0.1,
      },
    ]);
  });
});
