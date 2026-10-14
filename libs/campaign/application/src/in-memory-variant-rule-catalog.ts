import type { CampaignId, VariantRuleOption } from '@pioneer/campaign/domain';

import { VariantRuleCatalog } from './variant-rule-catalog';

/** Catalog adapter for tests: the variant rules each campaign can use are given up front, and can change. */
export class InMemoryVariantRuleCatalog extends VariantRuleCatalog {
  readonly #options = new Map<CampaignId, readonly VariantRuleOption[]>();

  /** The campaign can use exactly these variant rules from now on. */
  public offer(campaignId: CampaignId, options: readonly VariantRuleOption[]): this {
    this.#options.set(campaignId, options);
    return this;
  }

  public override async of(campaignId: CampaignId): Promise<readonly VariantRuleOption[]> {
    return this.#options.get(campaignId) ?? [];
  }
}
