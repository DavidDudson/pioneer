import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type {
  CampaignId,
  ItemTransferId,
  ItemTransferView,
  OfferItemBody,
  PendingTransfers,
} from '@pioneer/campaign/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's pending offers. */
function transfersKey(id: CampaignId | undefined): readonly unknown[] {
  return ['campaigns', 'transfers', id];
}

/**
 * The pending offers, of items and of coins, of the open campaign that involve the user's characters (ADR-0064), cached by TanStack Query.
 * There is no live stream (ADR-0018): every answer reads the list again, and the query refetches when the window is
 * focused again.
 */
@Injectable()
export class CampaignTransferStore {
  readonly #api = inject(ApiClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #transfers = injectScopedQuery<CampaignId, PendingTransfers>({
    id: computed(() => this.#campaigns.selected.data()?.id),
    key: transfersKey,
    fetch: async (id) => this.#api.call(CampaignContract.listTransfers, { params: { id }, body: undefined }),
    missing: 'No campaign selected',
  });

  /** The open campaign's pending offers to or from the user's characters, oldest first. */
  public readonly pending = this.#transfers.query;

  /** Offers an inventory line of the user's character to another character of the campaign. */
  public async offer(body: OfferItemBody): Promise<ItemTransferView> {
    const id = this.#transfers.openId();
    const offer = await this.#api.call(CampaignContract.offerItem, { params: { id }, body });
    await this.#transfers.invalidate(id);

    return offer;
  }

  /** The recipient's owner accepts the offer: the line moves to the recipient. */
  public async accept(transferId: ItemTransferId): Promise<void> {
    const id = this.#transfers.openId();
    await this.#api.call(CampaignContract.acceptTransfer, { params: { id, transferId }, body: undefined });
    await this.#transfers.invalidate(id);
  }

  /** The recipient's owner declines the offer; it stays with the giver. */
  public async decline(transferId: ItemTransferId): Promise<void> {
    const id = this.#transfers.openId();
    await this.#api.call(CampaignContract.declineTransfer, { params: { id, transferId }, body: undefined });
    await this.#transfers.invalidate(id);
  }

  /** The giver's owner withdraws the offer; it stays with the giver. */
  public async withdraw(transferId: ItemTransferId): Promise<void> {
    const id = this.#transfers.openId();
    await this.#api.call(CampaignContract.withdrawTransfer, { params: { id, transferId }, body: undefined });
    await this.#transfers.invalidate(id);
  }
}
