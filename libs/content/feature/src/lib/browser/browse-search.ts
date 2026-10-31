import { inject } from '@angular/core';
import { CONTENT_SCOPE, ContentLoader } from '@pioneer/rules/data-access';
import { SearchLimit, SearchOffset, SearchText } from '@pioneer/rules/sdk';
import type { ContentId, ContentSearchQuery } from '@pioneer/rules/sdk';
import { SOURCE_LOCALE } from '@pioneer/shared/kernel';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import type { BrowseKind } from './browse-kinds';

/** The most matches the browser asks for: the server's largest page. */
const MATCHES_MAX = SearchLimit.parse(200);
const FIRST_PAGE = SearchOffset.parse(0);
/** Search results are ranked, not cached for good: a re-seed changes them, and a minute is long enough to reuse. */
const SEARCH_STALE_MS = 60_000;

/** What is searched for: the words and the kinds they are searched among. */
export interface BrowseSearch {
  readonly words: SearchText;
  readonly kinds: readonly BrowseKind[];
}

/** The words a link holds, or undefined when it has none or only blanks. */
export function searchFromQuery(text: unknown): SearchText | undefined {
  const first: unknown = Array.isArray(text) ? text[0] : text;
  const parsed = SearchText.safeParse(first);
  return parsed.success ? parsed.data : undefined;
}

/**
 * The ids of the official entries of the kinds that match `search`, best first, as a query in an injection context.
 * Idle while there is nothing to search for. The server does the matching, so unlike the lists it needs a connection.
 */
export function injectBrowseSearch(search: () => BrowseSearch | undefined): CreateQueryResult<readonly ContentId[]> {
  const loader = inject(ContentLoader);
  const scope = inject(CONTENT_SCOPE);
  return injectQuery(() => {
    const wanted = search();
    const { homebrew, ready } = scope();
    return {
      queryKey: ['content', 'search', wanted?.words, wanted?.kinds.toSorted(), homebrew.toSorted()],
      enabled: wanted !== undefined && ready,
      staleTime: SEARCH_STALE_MS,
      queryFn: async (): Promise<readonly ContentId[]> => {
        if (wanted === undefined) {
          return [];
        }
        const query: ContentSearchQuery = {
          query: wanted.words,
          locale: SOURCE_LOCALE,
          kinds: [...wanted.kinds],
          packs: [...homebrew],
          limit: MATCHES_MAX,
          offset: FIRST_PAGE,
        };
        const found = await loader.search(query);
        return found.ids;
      },
    };
  });
}
