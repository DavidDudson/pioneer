import type { CampaignId, CampaignItemApproval, CampaignItemApprovalId } from '@pioneer/campaign/domain';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

/** The approval to take back, and when. */
export interface ItemRevocation {
  readonly id: CampaignItemApprovalId;
  readonly at: Temporal.Instant;
}

/**
 * Port for the rule-breaking items GMs have approved. A revoked approval is archived, never deleted (ADR-0062), and
 * every read skips it. Adapters live in `campaign-infrastructure`; the in-memory one is for tests.
 */
export abstract class CampaignItemApprovalRepository {
  /** The campaign's live approvals, oldest first; id breaks ties. */
  public abstract listForCampaign(campaignId: CampaignId): Promise<readonly CampaignItemApproval[]>;

  /** Approve the item, replacing the live approval for the same character, item, rule and rune when there is one. */
  public abstract approve(actor: UserId, campaignId: CampaignId, approval: CampaignItemApproval): Promise<void>;

  /** Archive the approval; nothing happens when the campaign has no live approval with that id. */
  public abstract revoke(actor: UserId, campaignId: CampaignId, revocation: ItemRevocation): Promise<void>;
}
