import type { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';

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
