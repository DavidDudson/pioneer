import { filterFromQuery, filterParamName, filterToQuery } from '@pioneer/rules/sdk';
import type { FacetDefinition, FilterParam, FilterQuery, FilterState, QueryParams, SlotKey } from '@pioneer/rules/sdk';

/** A slot's filter params are `f.<slot>.<facet id>`, so each feat picker keeps its own filters in the URL. */
function slotParam(slot: SlotKey, facet: FacetDefinition): string {
  return `f.${slot}.${facet.id}`;
}

/** `params` read as the filter params of `slot` alone, renamed to the plain `f.<facet id>` the filters read. */
function plainParams(params: QueryParams, slot: SlotKey, facets: readonly FacetDefinition[]): QueryParams {
  return Object.fromEntries(
    facets.flatMap((facet): (readonly [FilterParam, unknown])[] => {
      const value: unknown = params[slotParam(slot, facet)];
      return value === undefined ? [] : [[filterParamName(facet.id), value]];
    }),
  );
}

/** The filters `slot` has in the URL; empty when it has none, so the picker opens on its preset. */
export function slotFilterFromQuery(
  params: QueryParams,
  slot: SlotKey,
  facets: readonly FacetDefinition[],
): FilterState {
  return filterFromQuery(plainParams(params, slot, facets), facets);
}

/**
 * The query params that put `state` in the URL for `slot`, and clear the slot's other filters: a facet the new state
 * drops leaves the URL, and another slot's params are not touched.
 */
export function slotFilterToQuery(
  state: FilterState,
  slot: SlotKey,
  facets: readonly FacetDefinition[],
): Readonly<Record<string, string | undefined>> {
  const query: FilterQuery = filterToQuery(state, facets);
  return Object.fromEntries(
    facets.map((facet): readonly [string, string | undefined] => [
      slotParam(slot, facet),
      query[filterParamName(facet.id)],
    ]),
  );
}
