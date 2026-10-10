import type { Campaign, CampaignId, CampaignMember } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port for campaign persistence. Adapters live in `campaign-infrastructure`;
 * `InMemoryCampaignRepository` is for tests.
 */
export abstract class CampaignRepository {
  /** The campaigns `userId` is a member of, in the order they joined; campaign id breaks ties. */
  public abstract listForMember(userId: UserId): Promise<readonly Campaign[]>;

  /** Any campaign, with all its members; the service applies the access policy. */
  public abstract findById(id: CampaignId): Promise<Campaign | undefined>;

  /** Insert a new campaign and its members together, at version 1. */
  public abstract insert(campaign: Campaign): Promise<Campaign>;

  /**
   * Add a member and return the campaign with them in it. A user who is already a member (say, two
   * joins racing) stays as they were.
   */
  public abstract addMember(id: CampaignId, member: CampaignMember): Promise<Campaign>;
}
