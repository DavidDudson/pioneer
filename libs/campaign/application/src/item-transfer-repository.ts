import type { CampaignId, ItemTransfer } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port for the offers between a campaign's characters. An answered or withdrawn offer is kept as history, never
 * deleted (ADR-0062). Adapters live in `campaign-infrastructure`; the in-memory one is for tests.
 */
export abstract class ItemTransferRepository {
  /** The campaign's offers that have not been answered or withdrawn, oldest first; id breaks ties. */
  public abstract listPending(campaignId: CampaignId): Promise<readonly ItemTransfer[]>;

  public abstract insert(actor: UserId, campaignId: CampaignId, transfer: ItemTransfer): Promise<void>;
}
