import { contentCatalog } from '@pioneer/rules/catalog';
import { ContentRegistry } from '@pioneer/rules/sdk';

/** TanStack query options for the session's content registry: every pack, loaded once on first use. */
export interface ContentRegistryQuery {
  readonly queryKey: readonly ['content', 'registry'];
  readonly queryFn: () => Promise<ContentRegistry>;
  readonly staleTime: number;
}

export function contentRegistryQuery(): ContentRegistryQuery {
  return {
    queryKey: ['content', 'registry'] as const,
    queryFn: async (): Promise<ContentRegistry> => {
      const registry = new ContentRegistry();
      await Promise.all(contentCatalog.map(async (loader) => registry.load(loader)));
      return registry;
    },
    staleTime: Number.POSITIVE_INFINITY,
  };
}
