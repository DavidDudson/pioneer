import type { Campaign, CampaignId, CampaignInvite, CampaignMember } from '@pioneer/campaign/domain';
import type { Temporal, UserId } from '@pioneer/shared/kernel';

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
   * Add `member` to the invite's campaign as one step with checking the invite still works at `now`,
   * so a revoke that commits first stops the join. Undefined when the invite no longer works. Adding
   * someone bumps the campaign's version; a user who is already a member (say, two joins racing)
   * stays as they were.
   */
  public abstract joinByInvite(
    invite: CampaignInvite,
    member: CampaignMember,
    now: Temporal.Instant,
  ): Promise<Campaign | undefined>;
}
