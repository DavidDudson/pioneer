import { inject } from '@angular/core';
import { ContentLoader } from '@pioneer/rules/data-access';
import type { ContentEntry, RichText } from '@pioneer/rules/sdk';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

/**
 * An entry's own description, fetched from its shard, as a query in an injection context. The summary stands in until
 * it arrives or if it fails. Idle while there is no entry.
 */
export function injectEntryDescription(entry: () => ContentEntry | undefined): CreateQueryResult<RichText | undefined> {
  const loader = inject(ContentLoader);
  return injectQuery(() => {
    const shown = entry();
    return {
      queryKey: ['content', 'description', shown?.id],
      queryFn: async (): Promise<RichText | undefined> => (shown === undefined ? undefined : loader.description(shown)),
      enabled: shown !== undefined,
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
