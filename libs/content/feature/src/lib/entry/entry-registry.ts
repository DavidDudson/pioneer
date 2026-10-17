import { inject } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { entryKinds } from './entry-lookup';

/**
 * The entry's kind with the ones its text refers to, so a reference can be named and linked; none for a link with no
 * kind. The page and its breadcrumb read the same cache entry, so the registry loads once.
 */
export function injectEntryRegistry(kind: () => ContentKind | undefined): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  return injectQuery(() => {
    const own = kind();
    return {
      queryKey: ['content', 'entry', own],
      queryFn: async (): Promise<ContentRegistry> => loader.registry(own === undefined ? [] : entryKinds(own)),
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
