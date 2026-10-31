import { inject } from '@angular/core';
import { CONTENT_SCOPE, ContentLoader } from '@pioneer/rules/data-access';
import type { ContentEntry, RichText } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

/**
 * An entry's own description, fetched from its shard, as a query in an injection context. The summary stands in until
 * it arrives or if it fails. Idle while there is no entry.
 */
export function injectEntryDescription(entry: () => ContentEntry | undefined): CreateQueryResult<RichText | undefined> {
  const loader = inject(ContentLoader);
  const scope = inject(CONTENT_SCOPE);
  return injectQuery(() => {
    const shown = entry();
    const { homebrew, ready } = scope();
    return {
      queryKey: ['content', 'description', shown?.id, homebrew.toSorted()],
      queryFn: async (): Promise<RichText | undefined> =>
        shown === undefined ? undefined : loader.description(shown, homebrew),
      enabled: shown !== undefined && ready,
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
