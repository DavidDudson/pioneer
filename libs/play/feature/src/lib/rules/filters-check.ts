import {
  ContentEntry,
  facetCounts,
  facetsFor,
  filterEntries,
  filterFromQuery,
  filterToQuery,
} from '@pioneer/rules/sdk';
import type { ContentText, FacetCounts, QueryParams, SourceRef } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';
import * as z from 'zod';

import { CONTENT_KIND_KEYS } from './content-entry-examples';
import { CheckStatus, readJson } from './rules-check';
import type { JsonProblem } from './rules-check';

export const FiltersStatus = { Valid: CheckStatus.Valid, Problems: 'problems' } as const;
export type FiltersStatus = ValueOf<typeof FiltersStatus>;

/** An entry the filters keep: its name, its kind's message key and its sources (ADR-0005). */
interface KeptEntry {
  readonly name: ContentText;
  readonly kindKey: string;
  readonly sources: readonly SourceRef[];
}

export type FiltersCheck =
  | {
      readonly status: typeof FiltersStatus.Valid;
      readonly counts: readonly FacetCounts[];
      readonly kept: readonly KeptEntry[];
      readonly total: number;
      /** The query as the URL would hold it, in one canonical order, with what didn't read dropped. */
      readonly query: string;
    }
  | { readonly status: typeof FiltersStatus.Problems; readonly entries: JsonProblem };

const ENTRY_LIST = z.array(ContentEntry);

/** The text after `?` as the router would hand it over: one value per name, several when a name repeats. */
function queryParams(text: string): QueryParams {
  const search = new URLSearchParams(text.trim().replace(/^\?/u, ''));
  return Object.fromEntries(
    [...new Set(search.keys())].map((name) => {
      const values = search.getAll(name);
      return [name, values.length === 1 ? values[0] : values];
    }),
  );
}

/**
 * Filter the entries (a JSON array of content entries) with the query (URL query params, `f.<facet>=…`): the facets
 * of the kinds in the list with each value's count, the entries kept, and the query written back canonically.
 */
export function checkFilters(entriesText: string, queryText: string): FiltersCheck {
  const read = readJson(ENTRY_LIST, entriesText);
  if (read.status !== CheckStatus.Valid) {
    return { status: FiltersStatus.Problems, entries: read };
  }
  const entries = read.value;
  const facets = facetsFor([...new Set(entries.map((entry) => entry.kind))]);
  const state = filterFromQuery(queryParams(queryText), facets);
  const query = new URLSearchParams(filterToQuery(state, facets)).toString();
  return {
    status: FiltersStatus.Valid,
    counts: facetCounts(entries, facets, state),
    kept: filterEntries(entries, facets, state).map(({ name, kind, sources }) => ({
      name,
      kindKey: CONTENT_KIND_KEYS[kind],
      sources,
    })),
    total: entries.length,
    query: decodeURIComponent(query),
  };
}
