import * as z from 'zod';

import { FilterKind, filtersParam } from './filter-condition';
import type { FilterCondition, FilterProperties, FiltersParam } from './filter-condition';

/** How many values a page of facet counts holds. */
export const FACET_PAGE_SIZE = 50;

/** The longest text a facet search takes. */
const MAX_SEARCH_LENGTH = 100;

/** One value of a property and how many entries have it. */
export const FacetCount = z.object({ value: z.string(), count: z.number().int().min(0) });

export type FacetCount = z.output<typeof FacetCount>;

/** A page of one property's values with their counts, most common first, and how many values there are in all. */
export const FacetPage = z.object({
  items: z.array(FacetCount),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
});

export type FacetPage = z.output<typeof FacetPage>;

/** The conditions that count, a facet's own excluded: picking a value must not hide the others. */
export function otherConditions(
  conditions: ReadonlyArray<FilterCondition>,
  property: string,
): ReadonlyArray<FilterCondition> {
  return conditions.filter((condition) => condition.property !== property);
}

/** The schema `facetQuery` builds. */
export type FacetQuerySchema = z.ZodObject<{
  property: z.ZodString;
  filters: FiltersParam;
  search: z.ZodOptional<z.ZodString>;
  page: z.ZodDefault<z.ZodCoercedNumber>;
}>;

/**
 * The query schema of an entity's facet endpoint. `property` must be one of `properties` that has values to count (a
 * text property, found by search, has none); `filters` are the list's conditions, `search` narrows the values and
 * `page` pages them. Strict, so a stray parameter is rejected.
 */
export function facetQuery(properties: FilterProperties): FacetQuerySchema {
  const countable = new Set(
    Object.entries(properties)
      .filter(([, kind]) => kind !== FilterKind.Text)
      .map(([property]) => property),
  );

  return z.strictObject({
    property: z.string().refine((property) => countable.has(property), 'has no values to count'),
    filters: filtersParam(properties),
    search: z.string().trim().min(1).max(MAX_SEARCH_LENGTH).optional(),
    page: z.coerce.number().int().min(1).default(1),
  });
}
