import { inject, Injectable, resource, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { Character, CharacterId, CharacterPatch, CreateCharacterBody } from '@pioneer/character/domain';
import { ApiClient, ApiError } from '@pioneer/shared/web';

/** Server state for the character feature. Provided per route. */
@Injectable()
export class CharacterStore {
  readonly #api = inject(ApiClient);
  readonly #selectedId = signal<CharacterId | undefined>(undefined);

  public readonly list = resource({
    loader: async () => this.#api.call(CharacterContract.list, { params: {}, body: undefined }),
  });

  readonly #selected = resource({
    params: () => this.#selectedId(),
    loader: async ({ params: id }) => this.#api.call(CharacterContract.get, { params: { id }, body: undefined }),
  });

  /** The open character; `undefined` while loading. */
  public readonly selected: Signal<Character | undefined> = this.#selected.value;

  public select(id: CharacterId): void {
    this.#selectedId.set(id);
  }

  public async create(body: CreateCharacterBody): Promise<Character> {
    const character = await this.#api.call(CharacterContract.create, { params: {}, body });
    this.list.reload();
    return character;
  }

  /** One field edit. On success the selected character becomes the server's new version. */
  public async patch(patch: CharacterPatch): Promise<void> {
    const current = this.selected();
    if (current === undefined) {
      throw new Error('No character selected');
    }
    try {
      const saved = await this.#api.call(CharacterContract.patch, {
        params: { id: current.id },
        body: { expectedVersion: current.version, patch },
      });
      this.#selected.set(saved);
    } catch (error: unknown) {
      if (ApiError.isConflict(error)) {
        // Someone else saved first: pull their version so every field re-syncs.
        this.#selected.reload();
      }
      throw error;
    }
  }
}
