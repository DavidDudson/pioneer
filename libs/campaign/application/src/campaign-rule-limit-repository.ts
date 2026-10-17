import type { CampaignId, CampaignRuleLimit, RuleLimitKey } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** Port for the table limits campaigns have set. Adapters live in `campaign-infrastructure`; the in-memory one is for tests. */
export abstract class CampaignRuleLimitRepository {
  /** The limits the campaign has set, in no particular order. */
  public abstract listForCampaign(campaignId: CampaignId): Promise<readonly CampaignRuleLimit[]>;

  /** Set the limit, replacing the campaign's number for it when it has one. */
  public abstract set(actor: UserId, campaignId: CampaignId, limit: CampaignRuleLimit): Promise<void>;

  /** Return the limit to the core number; nothing happens when the campaign has not set it. */
  public abstract reset(actor: UserId, campaignId: CampaignId, limit: RuleLimitKey): Promise<void>;
}
