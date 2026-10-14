import type { CampaignId, CampaignVariantRule, EnabledVariantRuleId } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** Port for the variant rules enabled in campaigns. Adapters live in `campaign-infrastructure`; the in-memory one is for tests. */
export abstract class CampaignVariantRepository {
  /** The campaign's enabled variant rules, oldest first; id breaks ties. */
  public abstract listForCampaign(campaignId: CampaignId): Promise<readonly CampaignVariantRule[]>;

  /** Enable the variant rule unless the campaign has it already. */
  public abstract enable(actor: UserId, campaignId: CampaignId, rule: CampaignVariantRule): Promise<void>;

  /** Stop the campaign using the variant rule; nothing happens when it does not. */
  public abstract disable(actor: UserId, campaignId: CampaignId, variantId: EnabledVariantRuleId): Promise<void>;
}
