import { inject } from '@angular/core';
import { CONTENT_SCOPE, ContentLoader } from '@pioneer/rules/data-access';
import type { ContentEntry, LocalisedDescription } from '@pioneer/rules/sdk';
import { CONTENT_LOCALE } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

/**
 * An entry's own description in the viewer's content locale, fetched from its shard, as a query in an injection
 * context. It is marked `untranslated` when the locale has none and the source language's stands in. The summary
 * stands in until it arrives or if it fails. Idle while there is no entry.
 */
export function injectEntryDescription(
  entry: () => ContentEntry | undefined,
): CreateQueryResult<LocalisedDescription | undefined> {
  const loader = inject(ContentLoader);
  const scope = inject(CONTENT_SCOPE);
  const locale = inject(CONTENT_LOCALE);

  return injectQuery(() => {
    const shown = entry();
    const { homebrew, ready } = scope();

    return {
      queryKey: ['content', 'description', locale(), shown?.id, homebrew.toSorted()],
      queryFn: async (): Promise<LocalisedDescription | undefined> =>
        shown === undefined ? undefined : loader.description(shown, homebrew),
      enabled: shown !== undefined && ready,
      staleTime: Number.POSITIVE_INFINITY,
    };
  });
}
