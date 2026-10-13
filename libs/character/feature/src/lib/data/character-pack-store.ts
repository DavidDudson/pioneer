import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, CharacterPacks } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CharacterStore } from './character-store';

/** TanStack Query key for the packs a character uses. */
function packsKey(id: CharacterId | undefined): readonly unknown[] {
  return ['characters', 'packs', id];
}

/**
 * The packs the open character uses, cached by TanStack Query apart from the build: enabling one never changes the
 * character's version. Who decides them (the owner, or the campaign the character is in) comes with the list. Provided
 * by the sheet page.
 */
@Injectable()
export class CharacterPackStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #characters = inject(CharacterStore);
  readonly #id = computed(() => this.#characters.selected()?.id);

  /** The open character's packs, and for its owner the ones they could enable. */
  public readonly packs = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: packsKey(id),
      queryFn: async (): Promise<CharacterPacks> => {
        if (id === undefined) {
          throw new Error('No character selected');
        }
        return this.#api.call(CharacterContract.packs, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Enables a pack, and the packs it extends, on the open character. */
  public async enable(packId: ContentPackId): Promise<void> {
    const id = this.#openId();
    const packs = await this.#api.call(CharacterContract.enablePack, { params: { id }, body: { packId } });
    await this.#client.cancelQueries({ queryKey: packsKey(id) });
    this.#client.setQueryData(packsKey(id), packs);
  }

  /**
   * Stops the open character using a pack. Its row stays until the packs next load, so the focused button and its tick
   * survive; the picker offers the pack again now.
   */
  public async disable(packId: ContentPackId): Promise<void> {
    const id = this.#openId();
    const packs = await this.#api.call(CharacterContract.disablePack, { params: { id, packId }, body: undefined });
    await this.#client.cancelQueries({ queryKey: packsKey(id) });
    this.#client.setQueryData(packsKey(id), (shown: CharacterPacks | undefined): CharacterPacks => ({
      ...packs,
      enabled: shown?.enabled ?? packs.enabled,
    }));
    await this.#client.invalidateQueries({ queryKey: packsKey(id), refetchType: 'none' });
  }

  #openId(): CharacterId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No character selected');
    }
    return id;
  }
}
