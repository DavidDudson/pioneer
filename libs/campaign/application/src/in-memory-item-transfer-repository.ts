import type { CampaignId, ItemTransfer } from '@pioneer/campaign/domain';
import { TransferStatus } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { ItemTransferRepository } from './item-transfer-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryItemTransferRepository extends ItemTransferRepository {
  readonly #transfers = new Map<CampaignId, ItemTransfer[]>();
  readonly #actors: UserId[] = [];

  /** Every actor that wrote an offer, oldest first. */
  public get actors(): readonly UserId[] {
    return this.#actors;
  }

  public override async listPending(campaignId: CampaignId): Promise<readonly ItemTransfer[]> {
    return (this.#transfers.get(campaignId) ?? [])
      .filter((each) => each.status === TransferStatus.Pending)
      .toSorted(
        (left, right) => Temporal.Instant.compare(left.createdAt, right.createdAt) || left.id.localeCompare(right.id),
      );
  }

  public override async insert(actor: UserId, campaignId: CampaignId, transfer: ItemTransfer): Promise<void> {
    this.#actors.push(actor);
    this.#transfers.set(campaignId, [...(this.#transfers.get(campaignId) ?? []), transfer]);
  }
}
