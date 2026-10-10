import type { Signal } from '@angular/core';

/** What a `fetchNextPage()` call settles with: TanStack resolves even when the page fails. */
export interface PageFetch {
  readonly isError: boolean;
  readonly error: unknown;
}

/**
 * The slice of a TanStack infinite query that `fr-load-more` reads. Any
 * `injectInfiniteQuery(...)` result satisfies it.
 */
export interface LoadMoreQuery {
  readonly hasNextPage: Signal<boolean>;
  readonly isFetchingNextPage: Signal<boolean>;
  readonly fetchNextPage: () => Promise<PageFetch>;
}
