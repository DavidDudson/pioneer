import { inject } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract, filterConditionsOf } from '@pioneer/character/domain';
import type { CharacterListState, CharacterPage, CharacterPageQuery } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, keepPreviousData } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';

/** The API query for `state`: its order and page, with the filters as conditions. */
function pageQuery({ sort, direction, page, ...filter }: CharacterListState): CharacterPageQuery {
  return { sort, direction, page, filters: [...filterConditionsOf(filter)] };
}

/**
 * One page of the player's characters, narrowed by `state`, for the list page. A query of its own rather than the
 * store's, so a sheet, which has no use for the list, does not fetch it. Each state is its own entry under
 * `characterKeys.list`, so edits to a character mark every page stale; the page on screen stays until the next loads.
 */
export function injectCharacterList(state: Signal<CharacterListState>): CreateQueryResult<CharacterPage> {
  const api = inject(ApiClient);

  return injectQuery(() => ({
    queryKey: [...characterKeys.list(), state()],
    queryFn: async (): Promise<CharacterPage> =>
      api.call(CharacterContract.list, { params: {}, query: pageQuery(state()), body: undefined }),
    placeholderData: keepPreviousData,
  }));
}
