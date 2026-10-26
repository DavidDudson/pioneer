import { ItemTransferMessage, ItemTransferRepository } from '@pioneer/campaign/application';
import { TransferStatus } from '@pioneer/campaign/domain';
import type { CampaignId, ItemTransfer } from '@pioneer/campaign/domain';
import { ConflictError, message, Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignItemTransfers } from './campaign-item-transfer.table';

/** Name the command on the audit row it writes, as a service use case names a command. */
const OFFER_COMMAND = 'offer-campaign-item-transfer';

type ItemTransferRow = typeof campaignItemTransfers.$inferSelect;

function toTransfer(row: ItemTransferRow): ItemTransfer {
  return {
    id: row.id,
    from: row.fromCharacterId,
    to: row.toCharacterId,
    item: row.itemId,
    giverVersion: row.giverVersion,
    status: row.status,
    createdAt: Temporal.Instant.from(row.createdAt),
  };
}

export class DrizzleItemTransferRepository extends ItemTransferRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listPending(campaignId: CampaignId): Promise<readonly ItemTransfer[]> {
    const rows = await this.#db
      .select()
      .from(campaignItemTransfers)
      .where(
        and(eq(campaignItemTransfers.campaignId, campaignId), eq(campaignItemTransfers.status, TransferStatus.Pending)),
      )
      .orderBy(asc(campaignItemTransfers.createdAt), asc(campaignItemTransfers.id));
    return rows.map((row) => toTransfer(row));
  }

  public override async insert(actor: UserId, campaignId: CampaignId, transfer: ItemTransfer): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: OFFER_COMMAND });
      const inserted = await tx
        .insert(campaignItemTransfers)
        .values({
          id: transfer.id,
          campaignId,
          fromCharacterId: transfer.from,
          toCharacterId: transfer.to,
          itemId: transfer.item,
          giverVersion: transfer.giverVersion,
          status: transfer.status,
          createdAt: transfer.createdAt.toString(),
        })
        // The partial unique index allows one pending offer per line: a concurrent second offer loses here.
        .onConflictDoNothing()
        .returning({ id: campaignItemTransfers.id });
      if (inserted.length === 0) {
        throw new ConflictError(
          `Inventory item ${transfer.item} is already on offer`,
          message(ItemTransferMessage.AlreadyOffered),
        );
      }
    });
  }
}
