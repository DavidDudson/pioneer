import type { CampaignId, CampaignInvite, CampaignInviteId, InviteTokenHash } from '@pioneer/campaign/domain';
import type { Temporal } from '@pioneer/shared/kernel';

/**
 * Port for invite persistence. Adapters live in `campaign-infrastructure`;
 * `InMemoryCampaignInviteRepository` is for tests.
 */
export abstract class CampaignInviteRepository {
  public abstract insert(invite: CampaignInvite): Promise<CampaignInvite>;

  /** The invite a presented token belongs to, whatever its state. */
  public abstract findByTokenHash(tokenHash: InviteTokenHash): Promise<CampaignInvite | undefined>;

  public abstract findById(id: CampaignInviteId): Promise<CampaignInvite | undefined>;

  /** The campaign's invites that are neither revoked nor expired at `now`, newest first; id breaks ties. */
  public abstract listOpen(campaignId: CampaignId, now: Temporal.Instant): Promise<readonly CampaignInvite[]>;

  /** Store the invite's revocation; nothing else about an invite changes. */
  public abstract revoke(invite: CampaignInvite): Promise<CampaignInvite>;

  /** Revokes every invite of the campaign that still works at `now`, so none of its links let anyone in. */
  public abstract revokeOpen(campaignId: CampaignId, now: Temporal.Instant): Promise<void>;
}
