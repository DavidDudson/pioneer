import { computed, inject, Injectable } from '@angular/core';
import { CampaignContract } from '@pioneer/campaign/domain';
import type { ApproveItemBody, CampaignId, CampaignItemApprovalId, CampaignItemReview } from '@pioneer/campaign/domain';
import { ApiClient, injectScopedQuery } from '@pioneer/shared/web';

import { CampaignStore } from './campaign-store';

/** TanStack Query key for a campaign's rule-breaking items. */
export function itemReviewKey(id: CampaignId | undefined): readonly unknown[] {
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
  readonly #campaigns = inject(CampaignStore);
  readonly #reviews = injectScopedQuery<CampaignId, CampaignItemReview>({
    id: computed(() => this.#campaigns.selected.data()?.id),
    key: itemReviewKey,
    fetch: async (id) => this.#api.call(CampaignContract.itemReview, { params: { id }, body: undefined }),
    missing: 'No campaign selected',
  });

  /** The open campaign's flagged items: the approved ones, and for the GM the ones that need review. */
  public readonly review = this.#reviews.query;

  /** Approves an item of the open campaign's party for the count it is flagged at. */
  public async approve(item: ApproveItemBody): Promise<void> {
    const id = this.#reviews.openId();
    const review = await this.#api.call(CampaignContract.approveItem, { params: { id }, body: item });
    await this.#reviews.replace(id, review);
  }

  /** Takes an approval back, so the item needs review again. */
  public async revoke(approvalId: CampaignItemApprovalId): Promise<void> {
    const id = this.#reviews.openId();

    const review = await this.#api.call(CampaignContract.revokeItemApproval, {
      params: { id, approvalId },
      body: undefined,
    });

    await this.#reviews.replace(id, review);
  }
}
