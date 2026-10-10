import type { Signal } from '@angular/core';

/**
 * The slice of a TanStack Query result that `fr-async-region` reads. Any
 * `injectQuery(...)` or `injectInfiniteQuery(...)` result satisfies it.
 */
export interface AsyncQuery<TData> {
  readonly data: Signal<TData | undefined>;
  readonly error: Signal<unknown>;
  isPending: () => boolean;
  isError: () => boolean;
  /** An infinite query whose latest next page failed: `fr-load-more` shows that, so the region keeps its data. */
  isFetchNextPageError?: () => boolean;
}
