import { AncestryId, ContentId } from '@pioneer/rules/sdk';
import { facetQuery, FilterKind, FilterOperator, filtersParam, Pg } from '@pioneer/shared/kernel';
import type { FilterCondition, FilterProperties } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { Character } from './character';
import { CHARACTER_NAME_MAX_LENGTH, CharacterLevel } from './character-fields';

/** A page of the character list, counted from 1. A query string carries it as text, so it is coerced. */
export const PageNumber = z.coerce.number().int().min(1).brand<'PageNumber'>();

export type PageNumber = z.infer<typeof PageNumber>;

/** How many characters a page holds. */
export const PageSize = Pg.integer().min(1).brand<'PageSize'>();

export type PageSize = z.infer<typeof PageSize>;

/** How many characters there are, across every page. */
export const CharacterCount = Pg.integer().min(0).brand<'CharacterCount'>();

export type CharacterCount = z.infer<typeof CharacterCount>;

/** The characters on a page of the list. */
export const CHARACTER_PAGE_SIZE: PageSize = PageSize.parse(24);

/** The first page. */
export const FIRST_PAGE: PageNumber = PageNumber.parse(1);

/** Text to find in a character's name, ignoring case. */
export const CharacterSearch = z.string().trim().min(1).max(CHARACTER_NAME_MAX_LENGTH).brand<'CharacterSearch'>();

export type CharacterSearch = z.infer<typeof CharacterSearch>;

/** A level in a query string, which carries it as text. */
const QueryLevel = z.coerce.number().pipe(CharacterLevel);

/**
 * What the list page lets a person narrow by. Each is optional and they combine with AND: a level range (either end
 * open), the class and the ancestry picked, and text in the name. The API takes these as `FilterCondition`s
 * (`filterConditionsOf`), not as parameters of their own.
 */
export const CharacterFilter = z.strictObject({
  minLevel: QueryLevel.optional(),
  maxLevel: QueryLevel.optional(),
  classId: ContentId.optional(),
  ancestry: AncestryId.optional(),
  name: CharacterSearch.optional(),
});

export type CharacterFilter = z.output<typeof CharacterFilter>;

/** The character list's filterable properties and what each holds. */
export const CHARACTER_FILTER_PROPERTIES = {
  name: FilterKind.Text,
  level: FilterKind.Number,
  class: FilterKind.Set,
  ancestry: FilterKind.Set,
} as const satisfies FilterProperties;

export type CharacterFilterProperty = keyof typeof CHARACTER_FILTER_PROPERTIES;

/** The conditions that narrow the character list, ANDead. Each is checked against `CHARACTER_FILTER_PROPERTIES`. */
export const CharacterFilters = filtersParam(CHARACTER_FILTER_PROPERTIES);

export type CharacterFilters = z.output<typeof CharacterFilters>;

/** The values of one property with their counts, given the list's other conditions: what a filter's picker offers. */
export const CharacterFacetQuery = facetQuery(CHARACTER_FILTER_PROPERTIES);

export type CharacterFacetQuery = z.output<typeof CharacterFacetQuery>;

function condition(
  property: CharacterFilterProperty,
  operator: FilterOperator,
  ...values: Array<string>
): FilterCondition {
  return { property, operator, values };
}

/** The API conditions for what the page has set, in a fixed order; an unset filter makes none. */
export function filterConditionsOf(filter: CharacterFilter): ReadonlyArray<FilterCondition> {
  const { minLevel, maxLevel, classId, ancestry, name } = filter;

  const levels: ReadonlyArray<FilterCondition> =
    minLevel === undefined && maxLevel === undefined
      ? []
      : [condition('level', FilterOperator.Between, String(minLevel ?? ''), String(maxLevel ?? ''))];

  return [
    ...levels,
    ...(classId === undefined ? [] : [condition('class', FilterOperator.Is, classId)]),
    ...(ancestry === undefined ? [] : [condition('ancestry', FilterOperator.Is, ancestry)]),
    ...(name === undefined ? [] : [condition('name', FilterOperator.Contains, name)]),
  ];
}

/** One page of the character list with the count behind it, so a client can say "page 2 of 5". */
export const CharacterPage = z.object({
  items: z.array(Character.codec),
  total: CharacterCount,
  page: PageNumber,
  pageSize: PageSize,
});

export type CharacterPage = z.output<typeof CharacterPage>;
