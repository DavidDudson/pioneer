import type { CampaignId, CoinTransfer, ItemTransfer, ItemTransferId, Transfer } from '@pioneer/campaign/domain';
import { TransferStatus } from '@pioneer/campaign/domain';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { ItemTransferRepository } from './item-transfer-repository';
import type { TransferAnswer } from './item-transfer-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryItemTransferRepository extends ItemTransferRepository {
  readonly #transfers = new Map<CampaignId, ItemTransfer[]>();
  readonly #actors: UserId[] = [];
  readonly #coins = new Map<CampaignId, CoinTransfer[]>();

  /** Every actor that wrote an offer or an answer, oldest first. */
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

  /** Every coin offer stored, oldest first. */
  public get coinOffers(): readonly CoinTransfer[] {
    return [...this.#coins.values()].flat();
  }

  public override async findById(campaignId: CampaignId, id: ItemTransferId): Promise<Transfer | undefined> {
    const all: readonly Transfer[] = [
      ...(this.#transfers.get(campaignId) ?? []),
      ...(this.#coins.get(campaignId) ?? []),
    ];
    return all.find((each) => each.id === id);
  }

  public override async insert(actor: UserId, campaignId: CampaignId, transfer: ItemTransfer): Promise<void> {
    this.#actors.push(actor);
    this.#transfers.set(campaignId, [...(this.#transfers.get(campaignId) ?? []), transfer]);
  }

  public override async insertCoins(actor: UserId, campaignId: CampaignId, transfer: CoinTransfer): Promise<void> {
    this.#actors.push(actor);
    this.#coins.set(campaignId, [...(this.#coins.get(campaignId) ?? []), transfer]);
  }

  public override async answer({ actor, campaignId, id, status }: TransferAnswer): Promise<boolean> {
    const found = await this.findById(campaignId, id);
    if (found?.status !== TransferStatus.Pending) {
      return false;
    }
    this.#actors.push(actor);
    for (const stored of [...(this.#transfers.get(campaignId) ?? []), ...(this.#coins.get(campaignId) ?? [])]) {
      if (stored.id === id) {
        Object.assign(stored, { status });
      }
    }
    return true;
  }
}
