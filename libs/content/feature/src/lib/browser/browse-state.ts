import type { ContentBrowserState, ContentEntryRef } from '@pioneer/content/ui';
import { ContentKind, slugName } from '@pioneer/rules/sdk';
import type { ContentEntry } from '@pioneer/rules/sdk';

import { entryKinds } from '../entry/entry-lookup';
import { BROWSE_KINDS, DEFAULT_KINDS, facetsOf } from './browse-kinds';
import type { BrowseKind } from './browse-kinds';

/** The kinds a state lists: the ones the browser has, in its order, or the default when it names none. */
export function listedKinds(kinds: readonly ContentKind[]): readonly BrowseKind[] {
  const named = BROWSE_KINDS.filter((kind) => kinds.includes(kind));

  return named.length === 0 ? DEFAULT_KINDS : named;
}

/** The entry as a state names it. */
export function refOf(entry: ContentEntry): ContentEntryRef {
  return { kind: entry.kind, name: slugName(entry.slug) };
}

/**
 * The kinds to load for a state: those listed, a picked entry's own and referenced kinds, and traits for chip names.
 */
export function kindsToLoad(state: ContentBrowserState): readonly ContentKind[] {
  const listed = listedKinds(state.kinds);
  const wanted = state.selected === undefined ? listed : [...listed, ...entryKinds(state.selected.kind)];

  return [...new Set([...wanted, ContentKind.Trait])];
}

/** The state with the filters its kinds have; one for a facet the kinds drop leaves with them. */
export function withKnownFilters(state: ContentBrowserState): ContentBrowserState {
  const facets = facetsOf(listedKinds(state.kinds));

  return { ...state, filters: state.filters.filter((each) => facets.some((facet) => facet.id === each.field)) };
}
