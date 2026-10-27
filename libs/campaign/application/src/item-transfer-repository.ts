import type {
  CampaignId,
  CoinTransfer,
  ItemTransfer,
  ItemTransferId,
  Transfer,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/** Who moves which pending offer of a campaign to which status. */
export interface TransferAnswer {
  readonly actor: UserId;
  readonly campaignId: CampaignId;
  readonly id: ItemTransferId;
  readonly status: TransferStatus;
}

/**
 * Port for the item and coin offers between a campaign's characters. An answered or withdrawn offer is kept as history, never
 * deleted (ADR-0062). Adapters live in `campaign-infrastructure`; the in-memory one is for tests.
 */
export abstract class ItemTransferRepository {
  /** The campaign's offers that have not been answered or withdrawn, oldest first; id breaks ties. */
  public abstract listPending(campaignId: CampaignId): Promise<readonly ItemTransfer[]>;

  /** The campaign's offer of either kind, in any status; none when the campaign has no such offer. */
  public abstract findById(campaignId: CampaignId, id: ItemTransferId): Promise<Transfer | undefined>;

  public abstract insert(actor: UserId, campaignId: CampaignId, transfer: ItemTransfer): Promise<void>;

  /** Stores an offer of coins. Any number may be pending: the giver's purse is checked when it is offered and accepted. */
  public abstract insertCoins(actor: UserId, campaignId: CampaignId, transfer: CoinTransfer): Promise<void>;

  /**
   * Moves a pending offer to the answer's status, as one step with checking it is still pending, so two answers at once
   * cannot both win. False when the offer was no longer pending.
   */
  public abstract answer(answer: TransferAnswer): Promise<boolean>;
}
