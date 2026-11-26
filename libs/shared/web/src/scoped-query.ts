import { inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult, QueryKey } from '@tanstack/angular-query-experimental';

/** Builds the cache entry's next value from the one shown now. */
export type ScopedQueryUpdater<Data> = (shown: Data | undefined) => Data;

/** What a store says about the one record its query belongs to. */
export interface ScopedQueryOptions<Id, Data> {
  /** The open record's id, `undefined` while none is open. */
  readonly id: Signal<Id | undefined>;
  /** The cache key of the record's data. */
  readonly key: (id: Id | undefined) => QueryKey;
  /** Reads the record's data from the server. */
  readonly fetch: (id: Id) => Promise<Data>;
  /** The error message when a call needs the open record and none is open. */
  readonly missing: string;
  /** A further gate on top of a record being open, read as the query's `enabled`. */
  readonly enabled?: (() => boolean) | undefined;
}

/** A query of the open record's data, with the cache moves its store's mutations make. */
export interface ScopedQuery<Id, Data> {
  readonly query: CreateQueryResult<Data>;
  /** The open record's id; throws when none is open, so a mutation never runs against nothing. */
  readonly openId: () => Id;
  /** Puts a mutation's answer in the cache, once any read still in flight is cancelled. */
  readonly replace: (id: Id, data: Data | ScopedQueryUpdater<Data>) => Promise<void>;
  /** Marks the record's data stale; `refetch: false` leaves what is shown until the next load. */
  readonly invalidate: (id: Id, options?: { readonly refetch: boolean }) => Promise<void>;
}

/**
 * A TanStack query of one open record's data (a character's packs, a campaign's limits), keyed on its id and held off
 * until one is open. Replaces the `ApiClient` + `QueryClient` + guard + `#openId` shape each per-feature store repeated.
 * Call it in an injection context, as a field initialiser, like `injectQuery`.
 */
export function injectScopedQuery<Id, Data>(options: ScopedQueryOptions<Id, Data>): ScopedQuery<Id, Data> {
  const client = inject(QueryClient);

  const query = injectQuery(() => {
    const id = options.id();

    return {
      queryKey: options.key(id),
      queryFn: async (): Promise<Data> => {
        if (id === undefined) {
          throw new Error(options.missing);
        }

        return options.fetch(id);
      },
      enabled: id !== undefined && (options.enabled?.() ?? true),
    };
  });

  return {
    query,
    openId: (): Id => {
      const id = options.id();

      if (id === undefined) {
        throw new Error(options.missing);
      }

      return id;
    },
    replace: async (id: Id, data: Data | ScopedQueryUpdater<Data>): Promise<void> => {
      await client.cancelQueries({ queryKey: options.key(id) });
      client.setQueryData(options.key(id), data);
    },
    invalidate: async (id: Id, invalidation?: { readonly refetch: boolean }): Promise<void> => {
      await client.invalidateQueries({
        queryKey: options.key(id),
        refetchType: invalidation?.refetch === false ? 'none' : 'active',
      });
    },
  };
}
