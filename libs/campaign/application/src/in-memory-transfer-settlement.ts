import type { CampaignId, Transfer } from '@pioneer/campaign/domain';
import { TransferStatus } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import type { ItemTransferRepository } from './item-transfer-repository';
import { TransferSettlement } from './transfer-settlement';

/** Adapter for tests: marks the offer accepted, or fails as set, and keeps what it was asked to settle. */
export class InMemoryTransferSettlement extends TransferSettlement {
  readonly #transfers: ItemTransferRepository;
  readonly #settled: Transfer[] = [];
  #failure: Error | undefined;

  public constructor(transfers: ItemTransferRepository) {
    super();
    this.#transfers = transfers;
  }

  /** Every offer accepted, oldest first. */
  public get settled(): readonly Transfer[] {
    return this.#settled;
  }

  /** The next accept fails with `error`, leaving the offer pending. */
  public failWith(error: Error): this {
    this.#failure = error;
    return this;
  }

  public override async accept(actor: UserId, campaignId: CampaignId, transfer: Transfer): Promise<void> {
    if (this.#failure !== undefined) {
      throw this.#failure;
    }
    await this.#transfers.answer({ actor, campaignId, id: transfer.id, status: TransferStatus.Accepted });
    this.#settled.push(transfer);
  }
}
