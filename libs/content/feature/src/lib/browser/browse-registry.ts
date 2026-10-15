import { inject } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentRegistry } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import type { BrowseKind } from './browse-kinds';

/**
 * The official packs' entries of `kinds`, as a query in an injection context. The loader keeps the bundles in the
 * browser, so a kind seen before needs no request and the list works offline.
 */
export function injectBrowseRegistry(kinds: () => readonly BrowseKind[]): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  return injectQuery(() => {
    const wanted = kinds();
    return {
      queryKey: ['content', 'browse', wanted.toSorted()],
      queryFn: async (): Promise<ContentRegistry> => loader.registry(wanted),
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
