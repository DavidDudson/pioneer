import type { Campaign, CampaignCommand, CampaignId, CampaignInvite, CampaignMember } from '@pioneer/campaign/domain';
import type { AuditContext, Temporal, UserId, Version } from '@pioneer/shared/kernel';

/** Who archived or restored a campaign, and by which command, as the audit log records it. */
export type CampaignAudit = AuditContext<CampaignCommand>;

/**
 * Port for campaign persistence. Adapters live in `campaign-infrastructure`;
 * `InMemoryCampaignRepository` is for tests.
 */
export abstract class CampaignRepository {
  /** The live campaigns `userId` is a member of, in the order they joined; campaign id breaks ties. */
  public abstract listForMember(userId: UserId): Promise<readonly Campaign[]>;

  /** The archived campaigns `gmId` runs (ADR-0062), in the order they joined them; campaign id breaks ties. */
  public abstract listArchivedForGm(gmId: UserId): Promise<readonly Campaign[]>;

  /** Any live campaign, with all its members; an archived one reads as missing. The service applies the access policy. */
  public abstract findById(id: CampaignId): Promise<Campaign | undefined>;

  /** Any archived campaign; a live one reads as missing here. */
  public abstract findArchivedById(id: CampaignId): Promise<Campaign | undefined>;

  /** Marks a live campaign archived at `now`, leaving its version, members and everything it holds alone. A no-op if it already is. */
  public abstract archive(id: CampaignId, now: Temporal.Instant, audit: CampaignAudit): Promise<void>;

  /** Clears the archived mark. A no-op if the campaign is live. */
  public abstract restore(id: CampaignId, audit: CampaignAudit): Promise<void>;

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

  /**
   * Store `campaign`'s members and GM, if the stored campaign is still at `expectedVersion`: members it no
   * longer lists are removed and roles change to match. Returns it as stored, at its own version.
   * Throws `VersionConflictError` when someone changed the campaign first.
   */
  public abstract updateMembers(campaign: Campaign, expectedVersion: Version): Promise<Campaign>;
}
