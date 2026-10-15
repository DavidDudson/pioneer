import { facetCounts, filterEntries } from '@pioneer/rules/sdk';
import type {
  ContentEntry,
  ContentId,
  ContentRegistry,
  FacetCounts,
  FacetDefinition,
  FilterState,
} from '@pioneer/rules/sdk';

import type { BrowseKind } from './browse-kinds';

/** The entries of `kinds` in the registry's packs. A later pack's entry of the same id wins, as in the registry. */
export function entriesOf(registry: ContentRegistry, kinds: readonly BrowseKind[]): readonly ContentEntry[] {
  const held = registry.packs.flatMap((pack) =>
    pack.otherEntries.filter((entry) => kinds.some((kind) => kind === entry.kind)),
  );
  return [...new Map(held.map((entry) => [entry.id, entry])).values()];
}

/** What the browser shows: each facet's value counts and the entries `state` keeps, by name or by relevance. */
export interface BrowseList {
  readonly counts: readonly FacetCounts[];
  readonly entries: readonly ContentEntry[];
}

/**
 * What the list is made from: the entries of the kinds picked, the facets those kinds have and the filters in force.
 * With `matches`, the ids a search found best first, only those entries are listed, in that order.
 */
export interface BrowseQuery {
  readonly entries: readonly ContentEntry[];
  readonly facets: readonly FacetDefinition[];
  readonly state: FilterState;
  readonly matches?: readonly ContentId[] | undefined;
}

/** The entries whose ids are in `matches`, in the order of `matches`. A match the bundles do not hold is skipped. */
function matched(entries: readonly ContentEntry[], matches: readonly ContentId[]): readonly ContentEntry[] {
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  return matches.flatMap((id) => byId.get(id) ?? []);
}

/** The list for `query`: each count says what picking that value would leave. */
export function browseList(
  { entries, facets, state, matches }: BrowseQuery,
  compare: (left: string, right: string) => number,
): BrowseList {
  const searched = matches === undefined ? undefined : matched(entries, matches);
  const kept = filterEntries(searched ?? entries, facets, state);
  return {
    counts: facetCounts(searched ?? entries, facets, state),
    entries: searched === undefined ? kept.toSorted((left, right) => compare(left.name, right.name)) : kept,
  };
}
