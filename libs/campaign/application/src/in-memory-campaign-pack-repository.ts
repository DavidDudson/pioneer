import type { CampaignId, CampaignPack, EnabledPackId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { CampaignPackRepository } from './campaign-pack-repository';
import type { PackEnablement } from './campaign-pack-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignPackRepository extends CampaignPackRepository {
  readonly #rows = new Map<CampaignId, CampaignPack[]>();

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignPack[]> {
    return (this.#rows.get(campaignId) ?? []).toSorted(
      (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
    );
  }

  public override async enable(
    _actor: UserId,
    { campaignId, packs }: PackEnablement,
    whileLocked: () => Promise<void>,
  ): Promise<void> {
    await whileLocked();
    const rows = this.#rows.get(campaignId) ?? [];
    const fresh = packs.filter((pack) => !rows.some((row) => row.packId === pack.packId));
    this.#rows.set(campaignId, [...rows, ...fresh]);
  }

  public override async disable(_actor: UserId, campaignId: CampaignId, packId: EnabledPackId): Promise<void> {
    this.#rows.set(
      campaignId,
      (this.#rows.get(campaignId) ?? []).filter((row) => row.packId !== packId),
    );
  }
}
