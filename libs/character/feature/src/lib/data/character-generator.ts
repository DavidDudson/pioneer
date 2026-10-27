import { inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { GenerateCharacterBody, GeneratedCharacter } from '@pioneer/character/domain';
import { ApiClient } from '@pioneer/shared/web';
import { QueryClient } from '@tanstack/angular-query-experimental';

import { characterKeys } from './character-store';

/** Makes characters at random on the server. Provided per route, with the character store. */
@Injectable()
export class CharacterGenerator {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);

  /** A new character from a level, a seed and a name, with the seed that made it. */
  public async generate(body: GenerateCharacterBody): Promise<GeneratedCharacter> {
    const generated = await this.#api.call(CharacterContract.generate, { params: {}, body });
    // Stale, not refetched now: the list refetches when it is next shown.
    await this.#client.invalidateQueries({ queryKey: characterKeys.list(), refetchType: 'none' });
    return generated;
  }
}
