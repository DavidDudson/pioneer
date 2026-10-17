import type { CampaignId, RuleLimitOverrides } from '@pioneer/campaign/domain';

/**
 * Port to the table limits the variant rules a campaign has on change (ADR-0064). Where two variants change the same
 * limit the more permissive wins. The rules context owns the variant rules and the campaign context may not import it,
 * so the adapter lives in the composition root. `InMemoryCampaignVariantLimits` is for tests.
 */
export abstract class CampaignVariantLimits {
  /** The limits the campaign's variant rules change; a limit none changes is left out. */
  public abstract of(campaignId: CampaignId): Promise<RuleLimitOverrides>;
}
