import { ContentSearchContract } from '@pioneer/rules/sdk';
import type { ContentPackId } from '@pioneer/rules/sdk';
import type { UserId } from '@pioneer/shared/kernel';
import { ContractRouter } from '@pioneer/shared/server';
import type { RequestAuthenticator } from '@pioneer/shared/server';

import type { ContentSearchRepository } from './content-search-repository';

/** Official content is public, so the edge Worker may share a result; short, so a re-seed reaches searches in a minute. */
export const SEARCH_CACHE_CONTROL = 'public, max-age=60';
/**
 * A search that names homebrew packs is answered for the user who sent it, whether or not they may read them, so only that
 * browser may keep the result, and only briefly: a shared copy would hand one user the answer worked out for another.
 */
export const HOMEBREW_SEARCH_CACHE_CONTROL = 'private, max-age=10';

/**
 * Port: which homebrew packs a user may search. Homebrew owns who may read a pack, so the composition root implements
 * this over its access policy.
 */
export abstract class SearchableHomebrew {
  /** The packs among `packs` that `actor` may read; none for an anonymous caller. A pack that does not exist is left out. */
  public abstract readable(
    actor: UserId | undefined,
    packs: readonly ContentPackId[],
  ): Promise<readonly ContentPackId[]>;
}

/**
 * HTTP adapter for content search. Anyone may search official content (ADR-0007). A request that names homebrew packs
 * also searches those the signed-in caller may read, and is answered `private`, so no shared cache keeps it. A request
 * that names none is the same for everyone, so it is `public`.
 */
export function contentSearchRoutes(
  search: ContentSearchRepository,
  homebrew: SearchableHomebrew,
  auth: RequestAuthenticator,
): ContractRouter['app'] {
  return new ContractRouter('content-search-routes').handleMaybeSignedIn(
    ContentSearchContract.search,
    auth,
    async ({ actor, query, responseHeaders }) => {
      const named = query.packs.length > 0;
      const packs = named ? await homebrew.readable(actor, query.packs) : [];
      responseHeaders['cache-control'] = named ? HOMEBREW_SEARCH_CACHE_CONTROL : SEARCH_CACHE_CONTROL;
      if (!named) {
        // A renewed session cookie is for this user alone; a shared cache must never replay it.
        delete responseHeaders['set-cookie'];
      }
      return search.search({ ...query, packs });
    },
  ).app;
}
