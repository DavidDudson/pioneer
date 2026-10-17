import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignKeyItems, CharacterId, CreateKeyItemBody, KeyItemId } from '@pioneer/campaign/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's key items. */
function keyItemsKey(id: CampaignId | undefined): readonly unknown[] {
  return ['campaigns', 'key-items', id];
}

/**
 * The key items of the open campaign, cached by TanStack Query apart from the campaign: giving one never changes the
 * campaign's version. Every member reads them; the GM creates them, gives, moves and takes them back, and archives them
 * (ADR-0064).
 */
@Injectable()
export class CampaignKeyItemStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #id = computed(() => this.#campaigns.selected.data()?.id);

  /** The open campaign's key items and who holds them. */
  public readonly keyItems = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: keyItemsKey(id),
      queryFn: async (): Promise<CampaignKeyItems> => {
        if (id === undefined) {
          throw new Error('No campaign selected');
        }
        return this.#api.call(CampaignContract.keyItems, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Creates a key item, held by the party stash. */
  public async create(body: CreateKeyItemBody): Promise<void> {
    const id = this.#openId();
    await this.#store(id, await this.#api.call(CampaignContract.createKeyItem, { params: { id }, body }));
  }

  /** Gives the key item to a character in the party, or moves it from the one holding it. */
  public async give(keyItemId: KeyItemId, characterId: CharacterId): Promise<void> {
    const id = this.#openId();
    const params = { id, keyItemId };
    await this.#store(id, await this.#api.call(CampaignContract.giveKeyItem, { params, body: { characterId } }));
  }

  /** Takes the key item back to the party stash. */
  public async takeBack(keyItemId: KeyItemId): Promise<void> {
    const id = this.#openId();
    const params = { id, keyItemId };
    await this.#store(id, await this.#api.call(CampaignContract.takeBackKeyItem, { params, body: undefined }));
  }

  /** Archives the key item, which takes the holder's line with it. */
  public async archive(keyItemId: KeyItemId): Promise<void> {
    const id = this.#openId();
    const params = { id, keyItemId };
    await this.#store(id, await this.#api.call(CampaignContract.archiveKeyItem, { params, body: undefined }));
  }

  async #store(id: CampaignId, keyItems: CampaignKeyItems): Promise<void> {
    await this.#client.cancelQueries({ queryKey: keyItemsKey(id) });
    this.#client.setQueryData(keyItemsKey(id), keyItems);
  }

  #openId(): CampaignId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No campaign selected');
    }
    return id;
  }
}
