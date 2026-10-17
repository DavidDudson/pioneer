import type { CampaignId, RuleLimitOverrides } from '@pioneer/campaign/domain';

import { CampaignVariantLimits } from './campaign-variant-limits';

/** Adapter for tests: the limits each campaign's variant rules change are given up front, and can change. */
export class InMemoryCampaignVariantLimits extends CampaignVariantLimits {
  readonly #declared = new Map<CampaignId, RuleLimitOverrides>();

  /** The campaign's variant rules change exactly these limits from now on. */
  public declare(campaignId: CampaignId, limits: RuleLimitOverrides): this {
    this.#declared.set(campaignId, limits);
    return this;
  }

  public override async of(campaignId: CampaignId): Promise<RuleLimitOverrides> {
    return this.#declared.get(campaignId) ?? {};
  }
}
