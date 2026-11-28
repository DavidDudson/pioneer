import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type {
  CampaignId,
  CampaignKeyItems,
  CharacterId,
  CreateKeyItemBody,
  KeyItemId,
  PromoteItemBody,
} from '@pioneer/campaign/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';
import { QueryClient } from '@tanstack/angular-query-experimental';

import { itemReviewKey } from './campaign-item-review-store';
import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's key items. */
function keyItemsKey(id: CampaignId | undefined): ReadonlyArray<unknown> {
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
  readonly #items = injectScopedQuery<CampaignId, CampaignKeyItems>({
    id: computed(() => this.#campaigns.selected.data()?.id),
    key: keyItemsKey,
    fetch: async (id) => this.#api.call(CampaignContract.keyItems, { params: { id }, body: undefined }),
    missingMessage: 'No campaign selected',
  });

  /** The open campaign's key items and who holds them. */
  public readonly keyItems = this.#items.query;

  /** Creates a key item, held by the party stash. */
  public async create(body: CreateKeyItemBody): Promise<void> {
    const id = this.#items.openId();
    await this.#items.replace(id, await this.#api.call(CampaignContract.createKeyItem, { params: { id }, body }));
  }

  /**
   * Turns a flagged item into a key item held by its character. The item is flagged no more, so the review list is
   * read again.
   */
  public async promote(body: PromoteItemBody): Promise<void> {
    const id = this.#items.openId();
    await this.#items.replace(id, await this.#api.call(CampaignContract.promoteKeyItem, { params: { id }, body }));
    await this.#client.invalidateQueries({ queryKey: itemReviewKey(id) });
  }

  /** Gives the key item to a character in the party, or moves it from the one holding it. */
  public async give(keyItemId: KeyItemId, characterId: CharacterId): Promise<void> {
    const id = this.#items.openId();
    const params = { id, keyItemId };
    await this.#items.replace(
      id,
      await this.#api.call(CampaignContract.giveKeyItem, { params, body: { characterId } }),
    );
  }

  /** Takes the key item back to the party stash. */
  public async takeBack(keyItemId: KeyItemId): Promise<void> {
    const id = this.#items.openId();
    const params = { id, keyItemId };
    await this.#items.replace(id, await this.#api.call(CampaignContract.takeBackKeyItem, { params, body: undefined }));
  }

  /** Archives the key item, which takes the holder's line with it. */
  public async archive(keyItemId: KeyItemId): Promise<void> {
    const id = this.#items.openId();
    const params = { id, keyItemId };
    await this.#items.replace(id, await this.#api.call(CampaignContract.archiveKeyItem, { params, body: undefined }));
  }
}
