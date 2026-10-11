import { inject } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

/**
 * The kinds every character page's registry holds: ancestries, heritages and backgrounds for the options and the
 * engine, the ancestry features they grant, backgrounds and classes for their boosts, classes and class features for
 * the builder, statistics for the sheet. One list, so the pages share one query and the registry loads once a session.
 */
export const CHARACTER_CONTENT_KINDS: readonly ContentKind[] = [
  ContentKind.Ancestry,
  ContentKind.AncestryFeature,
  ContentKind.Heritage,
  ContentKind.Background,
  ContentKind.Class,
  ContentKind.ClassFeature,
  ContentKind.Statistic,
];

/** TanStack query options for a registry of every official pack's entries of some kinds, loaded once a session. */
export interface ContentRegistryQuery {
  readonly queryKey: readonly ['content', 'registry', ...ContentKind[]];
  readonly queryFn: () => Promise<ContentRegistry>;
  readonly staleTime: number;
}

/**
 * A registry of `kinds` from the content bundles, which `loader` keeps in the browser: only those kinds are fetched,
 * and a kind kept from an earlier visit needs no request.
 */
export function contentRegistryQuery(loader: ContentLoader, kinds: readonly ContentKind[]): ContentRegistryQuery {
  return {
    queryKey: ['content', 'registry', ...kinds.toSorted()],
    queryFn: async (): Promise<ContentRegistry> => loader.registry(kinds),
    staleTime: Number.POSITIVE_INFINITY,
  };
}

/**
 * The registry of `kinds` as a query, in an injection context: the loader and the query in one call. It loads only
 * while `enabled` says so, read reactively: the sheet loads the item kinds once a character has equipment.
 */
export function injectContentRegistry(
  kinds: readonly ContentKind[],
  enabled: () => boolean = (): boolean => true,
): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  return injectQuery(() => ({ ...contentRegistryQuery(loader, kinds), enabled: enabled() }));
}
