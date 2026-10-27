import type { CampaignId, Transfer } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

/**
 * Port that carries out an accepted offer. It moves the line or coins between the two characters and marks the offer
 * accepted in one transaction, so it spans the character context and the composition root provides it.
 * `InMemoryTransferSettlement` is for tests.
 */
export abstract class TransferSettlement {
  /**
   * Accepts the pending offer. Throws `VersionConflictError` when either character changed since the offer was made
   * (or since read), and `ConflictError` when the offer was answered first, the giver no longer has the line or coins,
   * or the recipient has no room; the characters and the offer are then as they were.
   */
  public abstract accept(actor: UserId, campaignId: CampaignId, transfer: Transfer): Promise<void>;
}
