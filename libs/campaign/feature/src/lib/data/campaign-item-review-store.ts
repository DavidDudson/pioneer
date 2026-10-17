import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { ApproveItemBody, CampaignId, CampaignItemApprovalId, CampaignItemReview } from '@pioneer/campaign/domain';
import { ApiClient } from '@pioneer/shared/web';
import { injectQuery, QueryClient } from '@tanstack/angular-query-experimental';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's rule-breaking items. */
function itemReviewKey(id: CampaignId | undefined): readonly unknown[] {
  return ['campaigns', 'item-review', id];
}

/**
 * The rule-breaking items of the open campaign's party, cached by TanStack Query apart from the campaign: approving an
 * item never changes the campaign's version. Every member reads the approved ones; the GM also reads the ones that
 * need review, and approves or revokes (ADR-0064).
 */
@Injectable()
export class CampaignItemReviewStore {
  readonly #api = inject(ApiClient);
  readonly #client = inject(QueryClient);
  readonly #campaigns = inject(CampaignStore);
  readonly #id = computed(() => this.#campaigns.selected.data()?.id);

  /** The open campaign's flagged items: the approved ones, and for the GM the ones that need review. */
  public readonly review = injectQuery(() => {
    const id = this.#id();
    return {
      queryKey: itemReviewKey(id),
      queryFn: async (): Promise<CampaignItemReview> => {
        if (id === undefined) {
          throw new Error('No campaign selected');
        }
        return this.#api.call(CampaignContract.itemReview, { params: { id }, body: undefined });
      },
      enabled: id !== undefined,
    };
  });

  /** Approves an item of the open campaign's party for the count it is flagged at. */
  public async approve(item: ApproveItemBody): Promise<void> {
    const id = this.#openId();
    const review = await this.#api.call(CampaignContract.approveItem, { params: { id }, body: item });
    await this.#store(id, review);
  }

  /** Takes an approval back, so the item needs review again. */
  public async revoke(approvalId: CampaignItemApprovalId): Promise<void> {
    const id = this.#openId();
    const review = await this.#api.call(CampaignContract.revokeItemApproval, {
      params: { id, approvalId },
      body: undefined,
    });
    await this.#store(id, review);
  }

  async #store(id: CampaignId, review: CampaignItemReview): Promise<void> {
    await this.#client.cancelQueries({ queryKey: itemReviewKey(id) });
    this.#client.setQueryData(itemReviewKey(id), review);
  }

  #openId(): CampaignId {
    const id = this.#id();
    if (id === undefined) {
      throw new Error('No campaign selected');
    }
    return id;
  }
}
