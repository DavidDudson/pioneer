import { inject } from '@angular/core';
import { CONTENT_SCOPE, ContentLoader } from '@pioneer/rules/data-access';
import type { ContentKind, ContentRegistry } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

/**
 * The entries of `kinds` in the official packs and the homebrew packs in scope, as a query in an injection context; idle while there are none to name. The loader keeps the bundles in the
 * browser, so a kind seen before needs no request and the list works offline.
 */
export function injectBrowseRegistry(
  kinds: () => readonly ContentKind[] | undefined,
): CreateQueryResult<ContentRegistry> {
  const loader = inject(ContentLoader);
  const scope = inject(CONTENT_SCOPE);
  return injectQuery(() => {
    const wanted = kinds();
    const { homebrew, ready } = scope();
    return {
      queryKey: ['content', 'browse', wanted?.toSorted(), homebrew.toSorted()],
      enabled: wanted !== undefined && ready,
      queryFn: async (): Promise<ContentRegistry> => loader.registry(wanted ?? [], homebrew),
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
