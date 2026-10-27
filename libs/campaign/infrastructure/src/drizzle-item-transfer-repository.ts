import { ItemTransferMessage, ItemTransferRepository } from '@pioneer/campaign/application';
import type { TransferAnswer } from '@pioneer/campaign/application';
import { OfferedCoinsSchema, TransferStatus } from '@pioneer/campaign/domain';
import type { CampaignId, CoinTransfer, ItemTransfer, ItemTransferId, Transfer } from '@pioneer/campaign/domain';
import { ConflictError, message, Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { campaignItemTransfers } from './campaign-item-transfer.table';

/** Name the command on the audit row it writes, as a service use case names a command. */
const OFFER_COMMAND = 'offer-campaign-item-transfer';
const OFFER_COINS_COMMAND = 'offer-campaign-coin-transfer';
const DECLINE_COMMAND = 'decline-campaign-transfer';
const ACCEPT_COMMAND = 'accept-campaign-transfer';
const WITHDRAW_COMMAND = 'withdraw-campaign-transfer';

/** The command each status an offer is moved to names on its audit row. */
const ANSWER_COMMANDS = {
  [TransferStatus.Pending]: OFFER_COMMAND,
  [TransferStatus.Accepted]: ACCEPT_COMMAND,
  [TransferStatus.Declined]: DECLINE_COMMAND,
  [TransferStatus.Withdrawn]: WITHDRAW_COMMAND,
} as const satisfies Record<TransferStatus, string>;

type ItemTransferRow = typeof campaignItemTransfers.$inferSelect;

/** An item offer's row; a coin offer has none of its item. */
function toTransfer(row: ItemTransferRow): ItemTransfer {
  if (row.itemId === null) {
    throw new Error(`Transfer ${row.id} is not an item offer`);
  }
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

/** A coin offer's row; an item offer has none of its coins. */
function toCoinTransfer(row: ItemTransferRow): CoinTransfer {
  if (row.platinum === null || row.gold === null || row.silver === null || row.copper === null) {
    throw new Error(`Transfer ${row.id} is not a coin offer`);
  }
  return {
    id: row.id,
    from: row.fromCharacterId,
    to: row.toCharacterId,
    coins: OfferedCoinsSchema.parse({ pp: row.platinum, gp: row.gold, sp: row.silver, cp: row.copper }),
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
        and(
          eq(campaignItemTransfers.campaignId, campaignId),
          eq(campaignItemTransfers.status, TransferStatus.Pending),
          isNotNull(campaignItemTransfers.itemId),
        ),
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

  public override async insertCoins(actor: UserId, campaignId: CampaignId, transfer: CoinTransfer): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: OFFER_COINS_COMMAND });
      await tx.insert(campaignItemTransfers).values({
        id: transfer.id,
        campaignId,
        fromCharacterId: transfer.from,
        toCharacterId: transfer.to,
        platinum: transfer.coins.pp,
        gold: transfer.coins.gp,
        silver: transfer.coins.sp,
        copper: transfer.coins.cp,
        giverVersion: transfer.giverVersion,
        status: transfer.status,
        createdAt: transfer.createdAt.toString(),
      });
    });
  }

  public override async findById(campaignId: CampaignId, id: ItemTransferId): Promise<Transfer | undefined> {
    const [row] = await this.#db
      .select()
      .from(campaignItemTransfers)
      .where(and(eq(campaignItemTransfers.campaignId, campaignId), eq(campaignItemTransfers.id, id)))
      .limit(1);
    if (row === undefined) {
      return undefined;
    }
    return row.itemId === null ? toCoinTransfer(row) : toTransfer(row);
  }

  public override async answer({ actor, campaignId, id, status }: TransferAnswer): Promise<boolean> {
    return this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor, command: ANSWER_COMMANDS[status] });
      // Pending only: of two answers at once the second finds no pending row and changes nothing.
      const answered = await tx
        .update(campaignItemTransfers)
        .set({ status })
        .where(
          and(
            eq(campaignItemTransfers.campaignId, campaignId),
            eq(campaignItemTransfers.id, id),
            eq(campaignItemTransfers.status, TransferStatus.Pending),
          ),
        )
        .returning({ id: campaignItemTransfers.id });
      return answered.length > 0;
    });
  }
}
