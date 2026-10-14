import type { CampaignId, VariantRuleOption } from '@pioneer/campaign/domain';

/**
 * Port to the variant rules a campaign can use: those defined by the official packs and by the homebrew packs it has
 * enabled. The rules context owns the content and the campaign context may not import it, so the adapter lives in the
 * composition root. `InMemoryVariantRuleCatalog` is for tests.
 */
export abstract class VariantRuleCatalog {
  /** The variant rules of the packs the campaign uses now, in no particular order. */
  public abstract of(campaignId: CampaignId): Promise<readonly VariantRuleOption[]>;
}
