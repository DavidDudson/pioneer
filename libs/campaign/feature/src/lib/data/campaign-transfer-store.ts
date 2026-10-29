import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type {
  CampaignId,
  ItemTransferId,
  ItemTransferView,
  OfferItemBody,
  PendingTransfers,
} from '@pioneer/campaign/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's pending item offers. */
function transfersKey(id: CampaignId | undefined): readonly unknown[] {
  return ['campaigns', 'transfers', id];
}

/**
 * The pending item offers of the open campaign that involve the user's characters (ADR-0064), cached by TanStack Query.
 * There is no live stream (ADR-0018): every answer reads the list again, and the query refetches when the window is
 * focused again.
 */
@Injectable()
export class CampaignTransferStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #id = computed(() => this.#campaigns.selected.data()?.id);

  /** The open campaign's pending offers to or from the user's characters, oldest first. */
  public readonly pending = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: transfersKey(id),
      queryFn: async (): Promise<PendingTransfers> => {
        if (id === undefined) {
          throw new Error('No campaign selected');
        }
        return this.#api.call(CampaignContract.listTransfers, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Offers an inventory line of the user's character to another character of the campaign. */
  public async offer(body: OfferItemBody): Promise<ItemTransferView> {
    const id = this.#openId();
    const offer = await this.#api.call(CampaignContract.offerItem, { params: { id }, body });
    await this.#refresh(id);
    return offer;
  }

  /** The recipient's owner accepts the offer: the line moves to the recipient. */
  public async accept(transferId: ItemTransferId): Promise<void> {
    const id = this.#openId();
    await this.#api.call(CampaignContract.acceptTransfer, { params: { id, transferId }, body: undefined });
    await this.#refresh(id);
  }

  /** The recipient's owner declines the offer; it stays with the giver. */
  public async decline(transferId: ItemTransferId): Promise<void> {
    const id = this.#openId();
    await this.#api.call(CampaignContract.declineTransfer, { params: { id, transferId }, body: undefined });
    await this.#refresh(id);
  }

  /** The giver's owner withdraws the offer; it stays with the giver. */
  public async withdraw(transferId: ItemTransferId): Promise<void> {
    const id = this.#openId();
    await this.#api.call(CampaignContract.withdrawTransfer, { params: { id, transferId }, body: undefined });
    await this.#refresh(id);
  }

  async #refresh(id: CampaignId): Promise<void> {
    await this.#client.invalidateQueries({ queryKey: transfersKey(id) });
  }

  #openId(): CampaignId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No campaign selected');
    }
    return id;
  }
}
