import { inject } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

/**
 * The official packs' entries of `kinds`, as a query in an injection context; idle while there are none to name. The loader keeps the bundles in the
 * browser, so a kind seen before needs no request and the list works offline.
 */
export function injectBrowseRegistry(
  kinds: () => readonly ContentKind[] | undefined,
): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  return injectQuery(() => {
    const wanted = kinds();
    return {
      queryKey: ['content', 'browse', wanted?.toSorted()],
      enabled: wanted !== undefined,
      queryFn: async (): Promise<ContentRegistry> => loader.registry(wanted ?? []),
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
