import type { CampaignId, CampaignVariantRule, EnabledVariantRuleId } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { CampaignVariantRepository } from './campaign-variant-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCampaignVariantRepository extends CampaignVariantRepository {
  readonly #rows = new Map<CampaignId, CampaignVariantRule[]>();

  public override async listForCampaign(campaignId: CampaignId): Promise<readonly CampaignVariantRule[]> {
    return (this.#rows.get(campaignId) ?? []).toSorted(
      (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
    );
  }

  public override async enable(_actor: UserId, campaignId: CampaignId, rule: CampaignVariantRule): Promise<void> {
    const rows = this.#rows.get(campaignId) ?? [];
    if (!rows.some((row) => row.variantId === rule.variantId)) {
      this.#rows.set(campaignId, [...rows, rule]);
    }
  }

  public override async disable(
    _actor: UserId,
    campaignId: CampaignId,
    variantId: EnabledVariantRuleId,
  ): Promise<void> {
    this.#rows.set(
      campaignId,
      (this.#rows.get(campaignId) ?? []).filter((row) => row.variantId !== variantId),
    );
  }
}
