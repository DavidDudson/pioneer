import { FilterKind, FilterOperator } from '@pioneer/frontier';
import type { FilterCondition, FilterField, FilterOption } from '@pioneer/frontier';
import { FacetType, FacetValue, RangeBound, SelectionKind } from '@pioneer/rules/sdk';
import type { FacetCounts, FacetDefinition, FacetId, FacetSelection, FilterState } from '@pioneer/rules/sdk';

const KINDS: Readonly<Record<FacetType, FilterKind>> = {
  [FacetType.Set]: FilterKind.Set,
  [FacetType.Range]: FilterKind.Range,
  [FacetType.Flag]: FilterKind.Flag,
};

/** Translates a message key (a facet's or a value's label). */
export type Label = (key: string) => string;

function optionsOf({ facet, values }: FacetCounts, label: Label): readonly FilterOption[] {
  return values.map(({ value, count }) => {
    const key = facet.values?.get(value);
    return { value, label: key === undefined ? value : label(key), count };
  });
}

/**
 * What the filter bar offers for a list's facets: a field per facet, a set or flag one with its values and how many
 * entries each leaves. The same definitions the facet panel reads, so the two agree.
 */
export function filterFields(counts: readonly FacetCounts[], label: Label): readonly FilterField[] {
  return counts.map((each) => {
    const kind = KINDS[each.facet.type];
    const base = { id: each.facet.id, label: label(each.facet.label), kind };
    return kind === FilterKind.Range ? base : { ...base, options: optionsOf(each, label) };
  });
}

function valuesConditions(
  field: FacetId,
  include: readonly FacetValue[],
  exclude: readonly FacetValue[],
): FilterCondition[] {
  const included: FilterCondition[] =
    include.length === 0
      ? []
      : [{ field, operator: include.length === 1 ? FilterOperator.Is : FilterOperator.IsAnyOf, values: include }];
  return [...included, ...exclude.map((value) => ({ field, operator: FilterOperator.IsNot, values: [value] }))];
}

function rangeConditions(field: FacetId, min: number | undefined, max: number | undefined): FilterCondition[] {
  if (min === undefined && max === undefined) {
    return [];
  }
  if (min === max) {
    return [{ field, operator: FilterOperator.Is, values: [String(min)] }];
  }
  return [{ field, operator: FilterOperator.Between, values: [String(min ?? ''), String(max ?? '')] }];
}

function selectionConditions(field: FacetId, selection: FacetSelection): FilterCondition[] {
  return selection.kind === SelectionKind.Values
    ? valuesConditions(field, selection.include, selection.exclude)
    : rangeConditions(field, selection.min, selection.max);
}

/**
 * The filter bar's chips for a filter state: a set or flag facet's picks are `is` (one) or `is any of` (several), each
 * exclusion an `is not`, and a range `is` one number or `between` two, either end open. An empty selection has no chip.
 */
export function filterConditions(state: FilterState): readonly FilterCondition[] {
  return [...state].flatMap(([field, selection]) => selectionConditions(field, selection));
}

function bound(text: string | undefined): RangeBound | undefined {
  const parsed = RangeBound.safeParse(text === undefined || text === '' ? undefined : Number(text));
  return parsed.success ? parsed.data : undefined;
}

function union(left: readonly FacetValue[], right: readonly FacetValue[]): readonly FacetValue[] {
  return [...left, ...right.filter((value) => !left.includes(value))];
}

function facetValueList(values: readonly string[]): readonly FacetValue[] {
  return values.flatMap((value) => {
    const parsed = FacetValue.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

function addToValues(current: FacetSelection | undefined, condition: FilterCondition): FacetSelection | undefined {
  const values = facetValueList(condition.values);
  const include = current?.kind === SelectionKind.Values ? current.include : [];
  const exclude = current?.kind === SelectionKind.Values ? current.exclude : [];
  if (values.length === 0) {
    return current;
  }
  return condition.operator === FilterOperator.IsNot
    ? { kind: SelectionKind.Values, include, exclude: union(exclude, values) }
    : { kind: SelectionKind.Values, include: union(include, values), exclude };
}

function addToRange(condition: FilterCondition): FacetSelection | undefined {
  const [first, second] = condition.values;
  const min = bound(first);
  const max = condition.operator === FilterOperator.Between ? bound(second) : min;
  return min === undefined && max === undefined ? undefined : { kind: SelectionKind.Range, min, max };
}

/**
 * The filter state the bar's chips mean, for `facets`. Chips of one facet combine (OR within it, as the engine
 * does); chips naming no facet, with no usable value, or an operator the facet's kind lacks are dropped, so a stale
 * or hand-made value never throws. The inverse of `filterConditions` for any state it can make.
 */
export function filterState(conditions: readonly FilterCondition[], facets: readonly FacetDefinition[]): FilterState {
  const state = new Map<FacetId, FacetSelection>();
  for (const condition of conditions) {
    const facet = facets.find((candidate) => candidate.id === condition.field);
    if (facet !== undefined) {
      const isRange = facet.type === FacetType.Range;
      const next = isRange ? addToRange(condition) : addToValues(state.get(facet.id), condition);
      if (next !== undefined) {
        state.set(facet.id, next);
      }
    }
  }
  return state;
}
