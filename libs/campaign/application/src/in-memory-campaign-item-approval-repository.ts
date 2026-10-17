import { sameLine } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignItemApproval } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { CampaignItemApprovalRepository } from './campaign-item-approval-repository';
import type { ItemRevocation } from './campaign-item-approval-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignItemApprovalRepository extends CampaignItemApprovalRepository {
  readonly #live = new Map<CampaignId, CampaignItemApproval[]>();
  readonly #archived = new Map<CampaignId, CampaignItemApproval[]>();

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignItemApproval[]> {
    return (this.#live.get(campaignId) ?? []).toSorted(
      (left, right) => Temporal.Instant.compare(left.approvedAt, right.approvedAt) || left.id.localeCompare(right.id),
    );
  }

  public override async approve(_actor: UserId, campaignId: CampaignId, approval: CampaignItemApproval): Promise<void> {
    const live = this.#live.get(campaignId) ?? [];
    this.#live.set(campaignId, [...live.filter((each) => !sameLine(each, approval)), approval]);
  }

  public override async revoke(_actor: UserId, campaignId: CampaignId, { id }: ItemRevocation): Promise<void> {
    const live = this.#live.get(campaignId) ?? [];
    const revoked = live.filter((each) => each.id === id);
    this.#live.set(
      campaignId,
      live.filter((each) => each.id !== id),
    );
    this.#archived.set(campaignId, [...(this.#archived.get(campaignId) ?? []), ...revoked]);
  }
}
