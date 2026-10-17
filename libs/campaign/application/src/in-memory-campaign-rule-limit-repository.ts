import type { CampaignId, CampaignRuleLimit, RuleLimitKey } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { CampaignRuleLimitRepository } from './campaign-rule-limit-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignRuleLimitRepository extends CampaignRuleLimitRepository {
  readonly #rows = new Map<CampaignId, CampaignRuleLimit[]>();

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignRuleLimit[]> {
    return this.#rows.get(campaignId) ?? [];
  }

  public override async set(_actor: UserId, campaignId: CampaignId, limit: CampaignRuleLimit): Promise<void> {
    const others = (this.#rows.get(campaignId) ?? []).filter((row) => row.limit !== limit.limit);
    this.#rows.set(campaignId, [...others, limit]);
  }

  public override async reset(_actor: UserId, campaignId: CampaignId, limit: RuleLimitKey): Promise<void> {
    this.#rows.set(
      campaignId,
      (this.#rows.get(campaignId) ?? []).filter((row) => row.limit !== limit),
    );
  }
}
