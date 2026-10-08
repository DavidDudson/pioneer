import type { Signal } from '@angular/core';

/**
 * The slice of a TanStack Query result that `fr-async-region` reads. Any
 * `injectQuery(...)` result satisfies it.
 */
export interface AsyncQuery<TData> {
  readonly data: Signal<TData | undefined>;
  readonly error: Signal<unknown>;
  isPending: () => boolean;
  isError: () => boolean;
}
