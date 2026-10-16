import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, UnenabledContent } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/** TanStack Query key for what a character uses that its campaign has not enabled. */
function unenabledKey(id: CharacterId | undefined): readonly unknown[] {
  return ['characters', 'unenabled-content', id];
}

/**
 * What the open character uses that its campaign has not enabled: variant rules, homebrew packs and the items carried
 * from them. Read-only, and empty while the character is in no campaign. Provided by the Plan tab's warning, so it
 * is only read where it is shown.
 */
@Injectable()
export class CharacterUnenabledStore {
  readonly #api = inject(ApiClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  public readonly content = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: unenabledKey(id),
      queryFn: async (): Promise<UnenabledContent> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.unenabledContent, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });
}
