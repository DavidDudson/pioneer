import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, UnenabledContent } from '@pioneer/character/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/**
 * What the open character uses that its campaign has not enabled: variant rules, homebrew packs and the items carried
 * from them. Read-only, and empty while the character is in no campaign. Provided by the Plan tab's warning, so it
 * is only read where it is shown.
 */
@Injectable()
export class CharacterUnenabledStore {
  readonly #api = inject(ApiClient);
  readonly #characters = inject(CharacterStore);

  public readonly content = injectScopedQuery<CharacterId, UnenabledContent>({
    id: computed(() => this.#characters.selected()?.id),
    key: characterKeys.unenabled,
    fetch: async (id) => this.#api.call(CharacterContract.unenabledContent, { params: { id }, body: undefined }),
    missingMessage: 'No character selected',
  }).query;
}
