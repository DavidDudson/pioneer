import { computed, inject, Injectable } from '@angular/core';
import { CharacterContract } from '@pioneer/character/domain';
import type { CharacterId, CharacterPacks } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { characterKeys } from './character-query-keys';
import { CharacterStore } from './character-store';

/**
 * The packs the open character uses, cached by TanStack Query apart from the build: enabling one never changes the
 * character's version. Who decides them (the owner, or the campaign the character is in) comes with the list. Provided
 * by the sheet page.
 */
@Injectable()
export class CharacterPackStore {
  readonly #api = inject(ApiClient);
  readonly #characters = inject(CharacterStore);
  readonly #packs = injectScopedQuery<CharacterId, CharacterPacks>({
    id: computed(() => this.#characters.selected()?.id),
    key: characterKeys.packs,
    fetch: async (id) => this.#api.call(CharacterContract.packs, { params: { id }, body: undefined }),
    missingMessage: 'No character selected',
  });

  /** The open character's packs, and for its owner the ones they could enable. */
  public readonly packs = this.#packs.query;

  /** Enables a pack, and the packs it extends, on the open character. */
  public async enable(packId: ContentPackId): Promise<void> {
    const id = this.#packs.openId();
    const packs = await this.#api.call(CharacterContract.enablePack, { params: { id }, body: { packId } });
    await this.#packs.replace(id, packs);
  }

  /**
   * Stops the open character using a pack. Its row stays until the packs next load, so the focused button and its tick
   * survive; the picker offers the pack again now.
   */
  public async disable(packId: ContentPackId): Promise<void> {
    const id = this.#packs.openId();
    const packs = await this.#api.call(CharacterContract.disablePack, { params: { id, packId }, body: undefined });
    await this.#packs.replace(id, (shown): CharacterPacks => ({ ...packs, enabled: shown?.enabled ?? packs.enabled }));
    await this.#packs.invalidate(id, { refetch: false });
  }
}
