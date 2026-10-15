import { computed, inject } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterAllies } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';
import type { CreateQueryResult } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/**
 * The open character's allies: the rest of its campaign's party, who may be named as the giver of an effect. Read once
 * `wanted` says so, since only the effect picker needs them and a character in no campaign has none.
 */
export function injectCharacterAllies(wanted: () => boolean): CreateQueryResult<CharacterAllies> {
  const api = inject(ApiClient);
  const characters = inject(CharacterStore);
  const id = computed(() => characters.selected()?.id);
  return injectQuery(() => {
    const characterId = id();
    return {
      queryKey: ['characters', 'allies', characterId],
      queryFn: async (): Promise<CharacterAllies> => {
        if (characterId === undefined) {
          throw new Error('No character selected');
        }
        return api.call(CharacterContract.allies, { params: { id: characterId }, body: undefined });
      },
      enabled: characterId !== undefined && wanted(),
    };
  });
}
