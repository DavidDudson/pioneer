import { ContentKind, EntryCount, FacetId, FacetValue, facetsFor, RangeBound, SelectionKind } from '@pioneer/rules/sdk';
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
    const state = withBound(new Map(), bulkFacet(), RangeSide.Max, 1);
    expect(state.get(BULK_ID)).toStrictEqual({ kind: SelectionKind.Range, min: undefined, max: RangeBound.parse(10) });
  });

  it('drops the facet from the state once both bounds are open', () => {
    const bounded = withBound(new Map(), bulkFacet(), RangeSide.Min, 1);
    expect(withBound(bounded, bulkFacet(), RangeSide.Min, undefined).has(BULK_ID)).toBe(false);
  });
});

describe(withValues, () => {
  it('drops the facet once nothing is picked or excluded', () => {
    const facet = bulkFacet();
    const picked: FilterState = withValues(new Map(), facet, new Set([FacetValue.parse('1')]));
    expect(withValues(picked, facet, new Set()).has(BULK_ID)).toBe(false);
  });
});

describe(facetRows, () => {
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
      { kind: FacetRowKind.Range, facet: bulkFacet(), min: undefined, max: 1, lowest: 0.1, highest: 2 },
    ]);
  });
});
