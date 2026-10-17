import type { FilterCondition } from '@pioneer/frontier';
import type { FacetTextCodec } from '@pioneer/frontier/data';
import { FacetId, filterFromQuery, filterParamName, filterToQuery } from '@pioneer/rules/sdk';
import type { FacetDefinition, QueryParams } from '@pioneer/rules/sdk';

import { filterConditions, filterState } from './filter-bar-state';

/** Between facets in the `f` segment: `traits:fire,!evil~level:1..5`. */
const FACET_SEPARATOR = '~';
/** Between a facet's id and its values. Neither can hold it: ids and values are slugs or numbers. */
const ID_SEPARATOR = ':';

function segmentsOf(text: string): readonly (readonly [string, string])[] {
  return text.split(FACET_SEPARATOR).flatMap((part): (readonly [string, string])[] => {
    const at = part.indexOf(ID_SEPARATOR);
    return at < 1 ? [] : [[part.slice(0, at), part.slice(at + ID_SEPARATOR.length)]];
  });
}

/** The facet filter params the `f` segment holds. Ids that aren't a facet's are dropped when the params are read. */
function paramsOf(text: string): QueryParams {
  const named = segmentsOf(text).flatMap(([id, values]): (readonly [string, string])[] => {
    const facet = FacetId.safeParse(id);
    return facet.success ? [[filterParamName(facet.data), values]] : [];
  });
  return Object.fromEntries(named);
}

/**
 * The table view's `f` segment for the filter bar's chips, over the facets `facets` gives (read on each call, so it
 * follows the kinds picked). The values are the facet URL codec's own text (`filterToQuery`, `filterFromQuery`), one
 * segment per facet, so there is no second encoding of a filter; only the param name `f.traits` becomes `traits:`.
 */
export function facetTextCodec(facets: () => readonly FacetDefinition[]): FacetTextCodec {
  return {
    encode: (conditions: readonly FilterCondition[]): string => {
      const known = facets();
      const query = filterToQuery(filterState(conditions, known), known);
      const segments = known.flatMap((facet): string[] => {
        const values = query[filterParamName(facet.id)];
        return values === undefined ? [] : [`${facet.id}${ID_SEPARATOR}${values}`];
      });
      return segments.join(FACET_SEPARATOR);
    },
    decode: (text: string): readonly FilterCondition[] => filterConditions(filterFromQuery(paramsOf(text), facets())),
  };
}
