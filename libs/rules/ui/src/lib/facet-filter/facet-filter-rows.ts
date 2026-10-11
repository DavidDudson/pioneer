import {
  BOOK_TITLES,
  BookId,
  CommonFacet,
  FacetMessage,
  FacetType,
  FLAG_LABELS,
  RangeBound,
  SelectionKind,
  UNKNOWN,
} from '@pioneer/rules/sdk';
import type {
  EntryCount,
  FacetCounts,
  FacetDefinition,
  FacetId,
  FacetSelection,
  FacetValue,
  FilterState,
} from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

export const FacetRowKind = { Chips: 'chips', Range: 'range' } as const;
export type FacetRowKind = ValueOf<typeof FacetRowKind>;

/** A value as a chip names it: a message key for a closed set's value or a book, else the value as it is. */
export interface ChipValue {
  readonly value: FacetValue;
  readonly key: string | undefined;
  readonly shown: string;
  readonly count: EntryCount;
}

/** A `set` or `flag` facet: its values as chips, the picked ones on. */
export interface ChipsRow {
  readonly kind: typeof FacetRowKind.Chips;
  readonly facet: FacetDefinition;
  readonly values: readonly ChipValue[];
  readonly selected: ReadonlySet<FacetValue>;
}

/** The lowest and highest values of a range in the list, in the unit it is shown in. */
interface RangeSpan {
  readonly lowest: number;
  readonly highest: number;
}

/** A `range` facet: its bounds, and its values' span; no span when nothing in the list has a value for it. */
interface RangeRow {
  readonly kind: typeof FacetRowKind.Range;
  readonly facet: FacetDefinition;
  readonly min: number | undefined;
  readonly max: number | undefined;
  readonly span: RangeSpan | undefined;
  /** The smallest step a bound takes in the unit it is shown in: a tenth for Bulk, so light can be picked. */
  readonly step: number;
}

export type FacetRow = ChipsRow | RangeRow;

/** Which bound of a range a box sets. */
export const RangeSide = { Min: 'min', Max: 'max' } as const;
export type RangeSide = ValueOf<typeof RangeSide>;

function chipKey(facet: FacetDefinition, value: FacetValue): string | undefined {
  if (value === UNKNOWN) {
    return FacetMessage.Unknown;
  }
  if (facet.type === FacetType.Flag) {
    return FLAG_LABELS.get(value);
  }
  if (facet.id === CommonFacet.Book) {
    const book = BookId.safeParse(value);
    return book.success ? BOOK_TITLES.get(book.data) : undefined;
  }
  return facet.values?.get(value);
}

const shownOf = (value: FacetValue, scale: number): number => Number(value) / scale;

function chipsRow({ facet, values }: FacetCounts, selection: FacetSelection | undefined): ChipsRow {
  const selected = new Set(selection?.kind === SelectionKind.Values ? selection.include : []);
  return {
    kind: FacetRowKind.Chips,
    facet,
    values: values.map(({ value, count }) => ({ value, key: chipKey(facet, value), shown: value, count })),
    selected,
  };
}

function rangeRow({ facet, values }: FacetCounts, selection: FacetSelection | undefined): RangeRow {
  const scale = facet.scale ?? 1;
  const shown = values.map(({ value }) => shownOf(value, scale));
  const range = selection?.kind === SelectionKind.Range ? selection : undefined;
  return {
    kind: FacetRowKind.Range,
    facet,
    min: range?.min === undefined ? undefined : range.min / scale,
    max: range?.max === undefined ? undefined : range.max / scale,
    span: shown.length === 0 ? undefined : { lowest: Math.min(...shown), highest: Math.max(...shown) },
    step: 1 / scale,
  };
}

/**
 * The panel's rows, one per facet with values to pick in the list: chips for a set or flag, two bounds for a range.
 * A facet with nothing to pick (no item in the list has it) is left out, unless something in it is picked, so it can
 * be cleared.
 */
export function facetRows(counts: readonly FacetCounts[], state: FilterState): readonly FacetRow[] {
  return counts.flatMap((facetCounts): FacetRow[] => {
    const selection = state.get(facetCounts.facet.id);
    if (facetCounts.values.length === 0 && selection === undefined) {
      return [];
    }
    return facetCounts.facet.type === FacetType.Range
      ? [rangeRow(facetCounts, selection)]
      : [chipsRow(facetCounts, selection)];
  });
}

function withSelection(state: FilterState, id: FacetId, selection: FacetSelection | undefined): FilterState {
  const next = new Map(state);
  if (selection === undefined) {
    next.delete(id);
  } else {
    next.set(id, selection);
  }
  return next;
}

/**
 * `state` with `facet` picking `include`. Values it excludes (from a link or a preset) stay excluded, unless picked:
 * picking an excluded value (Unique, under Available to you) lifts its exclusion.
 */
export function withValues(state: FilterState, facet: FacetDefinition, include: ReadonlySet<FacetValue>): FilterState {
  const current = state.get(facet.id);
  const excluded = current?.kind === SelectionKind.Values ? current.exclude : [];
  const exclude = excluded.filter((value) => !include.has(value));
  const empty = include.size === 0 && exclude.length === 0;
  return withSelection(
    state,
    facet.id,
    empty ? undefined : { kind: SelectionKind.Values, include: [...include].toSorted(), exclude },
  );
}

/** One bound of a range as a box sets it: which side, and its value in the unit it is shown in, or none. */
export interface BoundEdit {
  readonly side: RangeSide;
  readonly shown: number | undefined;
}

/**
 * `state` with one bound of `facet` set, or opened when the box is empty. A range with neither bound keeps
 * everything, so it leaves the state.
 */
export function withBound(state: FilterState, facet: FacetDefinition, { side, shown }: BoundEdit): FilterState {
  const current = state.get(facet.id);
  const range = current?.kind === SelectionKind.Range ? current : undefined;
  const bound = shown === undefined ? undefined : RangeBound.parse(Math.round(shown * (facet.scale ?? 1)));
  const min = side === RangeSide.Min ? bound : range?.min;
  const max = side === RangeSide.Max ? bound : range?.max;
  const open = min === undefined && max === undefined;
  return withSelection(state, facet.id, open ? undefined : { kind: SelectionKind.Range, min, max });
}
