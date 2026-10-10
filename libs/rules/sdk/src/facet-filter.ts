import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import type { ContentEntry } from './content-entry';
import { facetValues, FacetType, RangeBound, UNKNOWN } from './facet';
import type { FacetDefinition, FacetId, FacetValue } from './facet';

export const SelectionKind = { Values: 'values', Range: 'range' } as const;
export type SelectionKind = ValueOf<typeof SelectionKind>;

/** What a `set` or `flag` facet keeps: entries with any `include` value (all, if none) and no `exclude` value. */
export interface ValuesSelection {
  readonly kind: typeof SelectionKind.Values;
  readonly include: readonly FacetValue[];
  readonly exclude: readonly FacetValue[];
}

/**
 * What a `range` facet keeps: entries with a value between the bounds, inclusive. With a bound set, entries whose
 * value is unknown drop out; with none, the facet keeps everything.
 */
export interface RangeSelection {
  readonly kind: typeof SelectionKind.Range;
  readonly min: RangeBound | undefined;
  readonly max: RangeBound | undefined;
}

export type FacetSelection = RangeSelection | ValuesSelection;

/** The selection of each facet that narrows the list; a facet that isn't here keeps everything. */
export type FilterState = ReadonlyMap<FacetId, FacetSelection>;

/** How many entries are left. */
export const EntryCount = z.int().nonnegative().brand<'EntryCount'>();
export type EntryCount = z.infer<typeof EntryCount>;

export interface ValueCount {
  readonly value: FacetValue;
  readonly count: EntryCount;
}

/**
 * A facet's values with how many entries each would leave if it were the facet's only pick, the rest of the state
 * kept. Selected values are listed even at zero, so they can be cleared; `unknown` counts entries with no value.
 */
export interface FacetCounts {
  readonly facet: FacetDefinition;
  readonly values: readonly ValueCount[];
  readonly unknown: EntryCount;
}

function inRange(value: FacetValue, { min, max }: RangeSelection): boolean {
  if (value === UNKNOWN) {
    return false;
  }
  const number = Number(value);
  return (min === undefined || number >= min) && (max === undefined || number <= max);
}

function keeps(values: readonly FacetValue[], selection: FacetSelection): boolean {
  if (selection.kind === SelectionKind.Range) {
    const unbounded = selection.min === undefined && selection.max === undefined;
    return unbounded || values.some((value) => inRange(value, selection));
  }
  const included = selection.include.length === 0 || values.some((value) => selection.include.includes(value));
  return included && !values.some((value) => selection.exclude.includes(value));
}

function matches(entry: ContentEntry, facets: readonly FacetDefinition[], state: FilterState): boolean {
  return facets.every((facet) => {
    const selection = state.get(facet.id);
    return selection === undefined || keeps(facetValues(entry, facet), selection);
  });
}

/** The entries `state` keeps: OR within a facet, AND across facets. Order is kept. */
export function filterEntries(
  entries: readonly ContentEntry[],
  facets: readonly FacetDefinition[],
  state: FilterState,
): readonly ContentEntry[] {
  return entries.filter((entry) => matches(entry, facets, state));
}

/**
 * `state` with `facet` picking only `value`: its exclusions kept, or a range of just that value. A range can't pick
 * the unknown value (its count stands apart), so `state` comes back unchanged for it.
 */
export function onlyValue(state: FilterState, facet: FacetDefinition, value: FacetValue): FilterState {
  if (facet.type === FacetType.Range) {
    const bound = RangeBound.safeParse(value === UNKNOWN ? undefined : Number(value));
    return bound.success
      ? new Map([...state, [facet.id, { kind: SelectionKind.Range, min: bound.data, max: bound.data }]])
      : state;
  }
  const current = state.get(facet.id);
  const exclude = current?.kind === SelectionKind.Values ? current.exclude : [];
  return new Map([...state, [facet.id, { kind: SelectionKind.Values, include: [value], exclude }]]);
}

function selectedValues(selection: FacetSelection | undefined): readonly FacetValue[] {
  return selection?.kind === SelectionKind.Values ? [...selection.include, ...selection.exclude] : [];
}

/** How many of `entries` have each value of `facet`, skipping entries with a value the selection excludes. */
function tally(
  entries: readonly ContentEntry[],
  facet: FacetDefinition,
  selection: FacetSelection | undefined,
): Map<FacetValue, EntryCount> {
  const exclude = selection?.kind === SelectionKind.Values ? selection.exclude : [];
  const counts = new Map(selectedValues(selection).map((value) => [value, EntryCount.parse(0)]));
  for (const entry of entries) {
    const values = facetValues(entry, facet);
    if (!values.some((value) => exclude.includes(value))) {
      for (const value of values) {
        counts.set(value, EntryCount.parse((counts.get(value) ?? 0) + 1));
      }
    }
  }
  return counts;
}

/** Range values in number order; the rest by count, most first, then by value. */
function sortCounts(type: FacetType, counts: readonly ValueCount[]): readonly ValueCount[] {
  return type === FacetType.Range
    ? counts.toSorted((left, right) => Number(left.value) - Number(right.value))
    : counts.toSorted((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

/** Each facet's value counts over `entries` under `state` (see `FacetCounts`). */
export function facetCounts(
  entries: readonly ContentEntry[],
  facets: readonly FacetDefinition[],
  state: FilterState,
): readonly FacetCounts[] {
  return facets.map((facet): FacetCounts => {
    const others = new Map(state);
    others.delete(facet.id);
    const counts = tally(filterEntries(entries, facets, others), facet, state.get(facet.id));
    const unknown = counts.get(UNKNOWN) ?? EntryCount.parse(0);
    // A range can't pick the unknown value, so its count stands apart; a set or flag facet lists it like any value.
    if (facet.type === FacetType.Range) {
      counts.delete(UNKNOWN);
    }
    const values = [...counts].map(([value, count]) => ({ value, count }));
    return { facet, values: sortCounts(facet.type, values), unknown };
  });
}
