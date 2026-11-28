import { computed, signal } from '@angular/core';
import type { Signal } from '@angular/core';

import type { LoadMoreQuery, PageFetch } from '../async/load-more/load-more-query';

/**
 * A stand-in for an `injectInfiniteQuery(...)` result that a spec settles by hand: `fetchNextPage()` stays in flight
 * until `land` or `fail`. Starts with one page loaded.
 */
export class FakeInfiniteQuery<TItem> implements LoadMoreQuery {
  public readonly hasNextPage = signal(true);
  public readonly isFetchingNextPage = signal(false);
  public readonly fetches = signal(0);
  readonly #pages = signal<ReadonlyArray<ReadonlyArray<TItem>>>([]);
  public readonly items: Signal<ReadonlyArray<TItem>> = computed(() => this.#pages().flat());
  #settle: ((fetch: PageFetch) => void) | undefined = undefined;

  public constructor(first: ReadonlyArray<TItem>) {
    this.#pages.set([first]);
  }

  public readonly fetchNextPage = async (): Promise<PageFetch> => {
    const { promise, resolve } = Promise.withResolvers<PageFetch>();
    this.#settle = resolve;
    this.fetches.update((count) => count + 1);
    this.isFetchingNextPage.set(true);

    return promise;
  };

  /** The next page arrives; `last` when the server says there are no more. */
  public land(page: ReadonlyArray<TItem>, last = false): void {
    this.#pages.update((pages) => [...pages, page]);
    this.hasNextPage.set(!last);
    this.#finish({ isError: false, error: undefined });
  }

  public fail(error: Error): void {
    this.#finish({ isError: true, error });
  }

  #finish(fetch: PageFetch): void {
    this.isFetchingNextPage.set(false);
    this.#settle?.(fetch);
    this.#settle = undefined;
  }
}
