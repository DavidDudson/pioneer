import type { CampaignId, CampaignPack, EnabledPackId } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** The packs to enable in a campaign. */
export interface PackEnablement {
  readonly campaignId: CampaignId;
  readonly packs: readonly CampaignPack[];
}

/**
 * Port for the packs enabled in campaigns. Adapters live in `campaign-infrastructure`;
 * `InMemoryCampaignPackRepository` is for tests.
 */
export abstract class CampaignPackRepository {
  /** The campaign's enabled packs, oldest first; id breaks ties. */
  public abstract listForCampaign(campaignId: CampaignId): Promise<readonly CampaignPack[]>;

  /**
   * Enable the packs unless the campaign has them already. `whileLocked` runs first, with each pack held against a
   * change of visibility, which waits for this to commit and so sees the campaign (ADR-0055); if it throws, nothing is
   * stored. That makes the checks it holds race-free.
   */
  public abstract enable(actor: UserId, enablement: PackEnablement, whileLocked: () => Promise<void>): Promise<void>;

  /** Stop the campaign using the pack; nothing happens when it does not. */
  public abstract disable(actor: UserId, campaignId: CampaignId, packId: EnabledPackId): Promise<void>;
}
