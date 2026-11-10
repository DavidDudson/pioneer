import { inject } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-query-keys';

/**
 * The player's characters, for the list page. A query of its own rather than the store's, so a sheet, which has no use
 * for the list, does not fetch it. Edits to a character mark it stale through `characterKeys.list`.
 */
export function injectCharacterList(): CreateQueryResult<Character[]> {
  const api = inject(ApiClient);
  return injectQuery(() => ({
    queryKey: characterKeys.list(),
    queryFn: async (): Promise<Character[]> => api.call(CharacterContract.list, { params: {}, body: undefined }),
  }));
}
