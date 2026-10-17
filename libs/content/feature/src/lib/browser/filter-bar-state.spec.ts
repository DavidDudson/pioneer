import { FilterOperator } from '@pioneer/frontier';
import type { FilterCondition } from '@pioneer/frontier';
import {
  FacetId,
  FacetLabel,
  FacetType,
  FacetValue,
  FLAG_LABELS,
  RangeBound,
  SelectionKind,
  UNKNOWN,
} from '@pioneer/rules/sdk';
import type { FacetCounts, FacetDefinition, FacetSelection, FilterState } from '@pioneer/rules/sdk';
import { assert, constantFrom, integer, option, property, record, uniqueArray } from 'fast-check';
import type { Arbitrary } from 'fast-check';
import { describe, expect, it } from 'vitest';

import { filterConditions, filterFields, filterState } from './filter-bar-state';

const RARITY = FacetId.parse('rarity');
const LEVEL = FacetId.parse('level');
const CONSUMABLE = FacetId.parse('consumable');

const RARITY_FACET: FacetDefinition = {
  id: RARITY,
  type: FacetType.Set,
  path: ['rarity'],
  label: FacetLabel.parse('rules.facet.label.rarity'),
  values: new Map([[FacetValue.parse('rare'), FacetLabel.parse('rules.facet.rarity.rare')]]),
};

const LEVEL_FACET: FacetDefinition = {
  id: LEVEL,
  type: FacetType.Range,
  path: ['level'],
  label: FacetLabel.parse('rules.facet.label.level'),
};

const CONSUMABLE_FACET: FacetDefinition = {
  id: CONSUMABLE,
  type: FacetType.Flag,
  path: ['consumable'],
  label: FacetLabel.parse('rules.facet.label.consumable'),
  values: FLAG_LABELS,
};

const FACETS: readonly FacetDefinition[] = [RARITY_FACET, LEVEL_FACET, CONSUMABLE_FACET];

const VALUES = ['common', 'uncommon', 'rare', 'unique', 'yes', 'no'].map((value) => FacetValue.parse(value));
const facetValue: Arbitrary<FacetValue> = constantFrom(...VALUES, UNKNOWN);

/** A set or flag selection that narrows something, its picks and exclusions apart. */
const valuesSelection: Arbitrary<FacetSelection> = uniqueArray(facetValue, { maxLength: 4 })
  .chain((all) =>
    integer({ min: 0, max: all.length }).map((cut) => ({ include: all.slice(0, cut), exclude: all.slice(cut) })),
  )
  .filter(({ include, exclude }) => include.length + exclude.length > 0)
  .map(({ include, exclude }) => ({ kind: SelectionKind.Values, include, exclude }));

const bound: Arbitrary<RangeBound | undefined> = option(
  integer({ min: -1, max: 30 }).map((each) => RangeBound.parse(each)),
  { nil: undefined },
);

const rangeSelection: Arbitrary<FacetSelection> = record({ min: bound, max: bound })
  .filter(({ min, max }) => min !== undefined || max !== undefined)
  .map(({ min, max }) => ({ kind: SelectionKind.Range, min, max }));

const state: Arbitrary<FilterState> = record({
  rarity: option(valuesSelection, { nil: undefined }),
  level: option(rangeSelection, { nil: undefined }),
  consumable: option(valuesSelection, { nil: undefined }),
}).map(
  (picked) =>
    new Map(
      [
        [RARITY, picked.rarity],
        [LEVEL, picked.level],
        [CONSUMABLE, picked.consumable],
      ].flatMap(([id, selection]) => (selection === undefined ? [] : [[id, selection] as const])),
    ) as FilterState,
);

function bounded(value: number | undefined): RangeBound | undefined {
  return value === undefined ? undefined : RangeBound.parse(value);
}

/** The level facet picking from `min` to `max`, an end open when undefined. */
function level(min: number | undefined, max: number | undefined): FilterState {
  return new Map([[LEVEL, { kind: SelectionKind.Range, min: bounded(min), max: bounded(max) }]]);
}

const ZERO = 0 as FacetCounts['unknown'];
const RARE = FacetValue.parse('rare');
/** Every facet's counts: the rarity facet has four rare entries, the others no values. */
const COUNTS: readonly FacetCounts[] = [
  { facet: RARITY_FACET, values: [{ value: RARE, count: 4 as FacetCounts['unknown'] }], unknown: ZERO },
  { facet: LEVEL_FACET, values: [], unknown: ZERO },
  { facet: CONSUMABLE_FACET, values: [], unknown: ZERO },
];

describe('filter bar state', () => {
  it('turns a filter state into chips and back unchanged', () => {
    assert(
      property(state, (each) => {
        expect(filterState(filterConditions(each), FACETS)).toStrictEqual(each);
      }),
    );
  });

  it('makes no chip for a facet that keeps everything', () => {
    expect(filterConditions(new Map())).toStrictEqual([]);
  });

  it('reads a pick as is, picks as is any of, and each exclusion as its own is not', () => {
    const picked = new Map<FacetId, FacetSelection>([
      [
        RARITY,
        {
          kind: SelectionKind.Values,
          include: [FacetValue.parse('common'), FacetValue.parse('rare')],
          exclude: [FacetValue.parse('unique')],
        },
      ],
    ]);
    expect(filterConditions(picked)).toStrictEqual([
      { field: 'rarity', operator: FilterOperator.IsAnyOf, values: ['common', 'rare'] },
      { field: 'rarity', operator: FilterOperator.IsNot, values: ['unique'] },
    ]);
  });

  it('reads a range as is for one number and between for two, either end open', () => {
    expect(filterConditions(level(3, 3))).toStrictEqual([{ field: 'level', operator: 'is', values: ['3'] }]);
    expect(filterConditions(level(3, undefined))).toStrictEqual([
      { field: 'level', operator: 'between', values: ['3', ''] },
    ]);
    expect(filterConditions(level(undefined, 5))).toStrictEqual([
      { field: 'level', operator: 'between', values: ['', '5'] },
    ]);
  });

  it('combines chips of one facet the way the engine does: any pick, no exclusion', () => {
    const conditions: FilterCondition[] = [
      { field: 'rarity', operator: FilterOperator.Is, values: ['common'] },
      { field: 'rarity', operator: FilterOperator.Is, values: ['rare'] },
      { field: 'rarity', operator: FilterOperator.IsNot, values: ['unique'] },
    ];
    expect(filterState(conditions, FACETS).get(RARITY)).toStrictEqual({
      kind: SelectionKind.Values,
      include: ['common', 'rare'],
      exclude: ['unique'],
    });
  });

  it('drops chips it cannot use instead of throwing', () => {
    const conditions: FilterCondition[] = [
      { field: 'nonsense', operator: FilterOperator.Is, values: ['x'] },
      { field: 'rarity', operator: FilterOperator.Is, values: ['Not A Slug!'] },
      { field: 'rarity', operator: FilterOperator.Is, values: [] },
      { field: 'level', operator: FilterOperator.Between, values: ['', ''] },
      { field: 'level', operator: FilterOperator.Is, values: ['abc'] },
    ];
    expect(filterState(conditions, FACETS)).toStrictEqual(new Map());
  });

  it('offers a field per facet, with labelled values and their counts', () => {
    const fields = filterFields(COUNTS, (key) => `<${key}>`);
    expect(fields.map((field) => [field.id, field.label, field.kind])).toStrictEqual([
      ['rarity', '<rules.facet.label.rarity>', 'set'],
      ['level', '<rules.facet.label.level>', 'range'],
      ['consumable', '<rules.facet.label.consumable>', 'flag'],
    ]);
    expect(fields[0]?.options).toStrictEqual([{ value: 'rare', label: '<rules.facet.rarity.rare>', count: 4 }]);
    expect(fields[1]?.options).toBeUndefined();
  });
});
