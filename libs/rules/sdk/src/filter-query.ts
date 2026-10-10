import * as z from 'zod';

import { FacetType, FacetValue, FlagValue, RangeBound, UNKNOWN } from './facet';
import type { FacetDefinition, FacetId } from './facet';
import { SelectionKind } from './facet-filter';
import type { FacetSelection, FilterState, RangeSelection, ValuesSelection } from './facet-filter';

/** A query param's name: `f.level`. */
export const FilterParam = z.string().brand<'FilterParam'>();
export type FilterParam = z.infer<typeof FilterParam>;

/** A filter query param's value: `fire,!evil`, `1..5`. */
export const FilterParamText = z.string().brand<'FilterParamText'>();
export type FilterParamText = z.infer<typeof FilterParamText>;

/** Query params as the router holds them: a name to one value or several. Anything else under a name is ignored. */
export type QueryParams = Readonly<Record<string, unknown>>;

/** Query params a filter state writes, one per facet that narrows the list. */
export type FilterQuery = Readonly<Record<FilterParam, FilterParamText>>;

/** Filter params are `f.<facet id>`, so they never clash with the page's own (`q`, `page`). */
const PARAM_PREFIX = 'f.';
const VALUE_SEPARATOR = ',';
/** Marks an excluded value: `f.traits=fire,!evil`. */
const EXCLUDE_MARK = '!';
/** Separates a range's bounds, either of which may be left out: `f.level=1..5`, `f.level=..3`. */
const RANGE_SEPARATOR = '..';

const FLAG_VALUES: ReadonlySet<FacetValue> = new Set([FacetValue.parse(FlagValue.Yes), FacetValue.parse(FlagValue.No)]);

const paramName = (id: FacetId): FilterParam => FilterParam.parse(`${PARAM_PREFIX}${id}`);

function valuesText({ include, exclude }: ValuesSelection): FilterParamText {
  const tokens = [...include.toSorted(), ...exclude.toSorted().map((value) => `${EXCLUDE_MARK}${value}`)];
  return FilterParamText.parse(tokens.join(VALUE_SEPARATOR));
}

function rangeText({ min, max }: RangeSelection): FilterParamText {
  return FilterParamText.parse(`${min ?? ''}${RANGE_SEPARATOR}${max ?? ''}`);
}

function narrows(selection: FacetSelection): boolean {
  return selection.kind === SelectionKind.Range
    ? selection.min !== undefined || selection.max !== undefined
    : selection.include.length > 0 || selection.exclude.length > 0;
}

/**
 * The query params for `state`, in facet order with values sorted, so one state always gives one URL. Facets that
 * keep everything are left out.
 */
export function filterToQuery(state: FilterState, facets: readonly FacetDefinition[]): FilterQuery {
  const params = facets.flatMap((facet): (readonly [FilterParam, FilterParamText])[] => {
    const selection = state.get(facet.id);
    if (selection === undefined || !narrows(selection)) {
      return [];
    }
    const text = selection.kind === SelectionKind.Range ? rangeText(selection) : valuesText(selection);
    return [[paramName(facet.id), text]];
  });
  return Object.fromEntries(params);
}

/** The first text under `name`: the router gives an array when a param repeats. */
function paramText(params: QueryParams, name: FilterParam): FilterParamText | undefined {
  const value: unknown = params[name];
  const first: unknown = Array.isArray(value) ? value[0] : value;
  const parsed = FilterParamText.safeParse(first);
  return parsed.success ? parsed.data : undefined;
}

/** An empty side of `..` is an open bound; anything but a whole number is malformed. */
function boundOf(side: FilterParamText): RangeBound | undefined {
  const parsed = RangeBound.safeParse(side === '' ? undefined : Number(side));
  return parsed.success ? parsed.data : undefined;
}

function rangeOf(text: FilterParamText): RangeSelection | undefined {
  const [low, high, ...rest] = text.split(RANGE_SEPARATOR).map((side) => FilterParamText.parse(side));
  if (low === undefined || high === undefined || rest.length > 0) {
    return undefined;
  }
  const min = boundOf(low);
  const max = boundOf(high);
  const malformed = (low !== '' && min === undefined) || (high !== '' && max === undefined);
  return malformed ? undefined : { kind: SelectionKind.Range, min, max };
}

/** Whether `facet` can have `value`: any value of an open set, one of a closed set's or a flag's, or unknown. */
function allowed(facet: FacetDefinition, value: FacetValue): boolean {
  if (value === UNKNOWN) {
    return true;
  }
  if (facet.type === FacetType.Flag) {
    return FLAG_VALUES.has(value);
  }
  return facet.values === undefined || facet.values.has(value);
}

/** Values in the text, each once; excluding a value wins over including it. Values that don't read are dropped. */
function valuesOf(facet: FacetDefinition, text: FilterParamText): ValuesSelection {
  const include = new Set<FacetValue>();
  const exclude = new Set<FacetValue>();
  for (const token of text.split(VALUE_SEPARATOR)) {
    const excluded = token.startsWith(EXCLUDE_MARK);
    const parsed = FacetValue.safeParse(excluded ? token.slice(EXCLUDE_MARK.length) : token);
    if (parsed.success && allowed(facet, parsed.data)) {
      (excluded ? exclude : include).add(parsed.data);
    }
  }
  return {
    kind: SelectionKind.Values,
    include: [...include].filter((value) => !exclude.has(value)).toSorted(),
    exclude: [...exclude].toSorted(),
  };
}

function selectionOf(facet: FacetDefinition, text: FilterParamText): FacetSelection | undefined {
  const selection = facet.type === FacetType.Range ? rangeOf(text) : valuesOf(facet, text);
  return selection !== undefined && narrows(selection) ? selection : undefined;
}

/**
 * The filter state in `params`. Params that aren't a known facet's are someone else's and are ignored; values that
 * don't read are dropped rather than failing, so an old or hand-edited link still opens.
 */
export function filterFromQuery(params: QueryParams, facets: readonly FacetDefinition[]): FilterState {
  const state = new Map<FacetId, FacetSelection>();
  for (const facet of facets) {
    const text = paramText(params, paramName(facet.id));
    const selection = text === undefined ? undefined : selectionOf(facet, text);
    if (selection !== undefined) {
      state.set(facet.id, selection);
    }
  }
  return state;
}
