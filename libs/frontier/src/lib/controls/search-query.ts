import type { Signal } from '@angular/core';
import { Milliseconds } from '@pioneer/shared/kernel';
import { injectDebouncer } from '@tanstack/angular-pacer';

/** Quiet time after the last keystroke before a query fires. */
export const SEARCH_DEBOUNCE: Milliseconds = Milliseconds.parse(300);

export interface SearchQuerySource {
  /** The text the control shows now: a typed query that no longer matches it is stale and is dropped. */
  readonly current: Signal<string>;
  /** Fires a query. Never called twice in a row with the same query. */
  readonly emit: (query: string) => void;
}

export interface SearchQuery {
  /** A keystroke: fires once typing goes quiet, unless `current()` moved on meanwhile. */
  readonly type: (query: string) => void;
  /** Fires at once and drops any pending keystroke: Enter, Escape, clear, open. */
  readonly now: (query: string) => void;
  /** Drops the pending keystroke without firing. */
  readonly cancel: () => void;
}

interface Fired {
  /** The query `emit` last fired; undefined until it first fires. */
  last: string | undefined;
}

/**
 * The debounce and the repeat guard that `fr-search-input`, `fr-combobox` and `fr-picker` share: TanStack Pacer's
 * debouncer, cancelled on destroy so a pending query never fires after the control is gone. Call in an injection
 * context.
 */
export function injectSearchQuery(source: SearchQuerySource): SearchQuery {
  const fired: Fired = { last: undefined };

  const search = (query: string): void => {
    if (query === fired.last) {
      return;
    }

    fired.last = query;
    source.emit(query);
  };

  const debouncer = injectDebouncer(
    (query: string): void => {
      if (query === source.current()) {
        search(query);
      }
    },
    { wait: SEARCH_DEBOUNCE },
  );

  return {
    type: (query): void => {
      debouncer.maybeExecute(query);
    },
    now: (query): void => {
      debouncer.cancel();
      search(query);
    },
    cancel: (): void => {
      debouncer.cancel();
    },
  };
}
