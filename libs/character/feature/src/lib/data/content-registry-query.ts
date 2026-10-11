import type { ContentLoader } from '@pioneer/rules/data-access';
import { ContentKind } from '@pioneer/rules/sdk';
import type { ContentRegistry } from '@pioneer/rules/sdk';

/**
 * The kinds every character page's registry holds: ancestries, heritages and backgrounds for the options and the
 * engine, backgrounds and classes for their boosts, statistics for the sheet. One list, so the pages share one query
 * and the registry loads once a session.
 */
export const CHARACTER_CONTENT_KINDS: readonly ContentKind[] = [
  ContentKind.Ancestry,
  ContentKind.Heritage,
  ContentKind.Background,
  ContentKind.Class,
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
