import { ItemTransferMessage, TransferSettlement } from '@pioneer/campaign/application';
import { isCoinTransfer, TransferStatus } from '@pioneer/campaign/domain';
import type { CampaignId, Transfer } from '@pioneer/campaign/domain';
import { DrizzleItemTransferRepository } from '@pioneer/campaign/infrastructure';
import { CharacterTransferSettlement } from '@pioneer/character/application';
import { CharacterId, CoinsSchema, InventoryItemId, TransferRefusal } from '@pioneer/character/domain';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { ConflictError, message } from '@pioneer/shared/kernel';
import type { Clock, MessageDescriptor, UserId } from '@pioneer/shared/kernel';

import type { Database } from './database';

/** Why each refusal of the character context is a 409, as the campaign's offers word it. */
const REFUSALS = {
  [TransferRefusal.NoLine]: ItemTransferMessage.LineGone,
  [TransferRefusal.KeyItem]: ItemTransferMessage.KeyItemLine,
  [TransferRefusal.Full]: ItemTransferMessage.RecipientFull,
  [TransferRefusal.ShortCoins]: ItemTransferMessage.NotEnoughCoins,
} as const satisfies Record<TransferRefusal, string>;

function refused(refusal: TransferRefusal, transfer: Transfer): ConflictError {
  const descriptor: MessageDescriptor = message(REFUSALS[refusal]);
  return new ConflictError(`Transfer ${transfer.id} cannot be accepted: ${refusal}`, descriptor);
}

/**
 * The campaign context's `TransferSettlement` over the character context. It lives in the composition root because
 * neither context may import the other. The offer's status and both characters are written in one transaction: the
 * repositories are built on it, and their own transactions become savepoints inside it, so a conflict on either side
 * rolls the whole accept back.
 */
export class DatabaseTransferSettlement extends TransferSettlement {
  readonly #db: Database;
  readonly #clock: Clock;

  public constructor(db: Database, clock: Clock) {
    super();
    this.#db = db;
    this.#clock = clock;
  }

  public override async accept(actor: UserId, campaignId: CampaignId, transfer: Transfer): Promise<void> {
    await this.#db.transaction(async (tx) => {
      const transfers = new DrizzleItemTransferRepository(tx);
      const settlement = new CharacterTransferSettlement(new DrizzleCharacterRepository(tx), this.#clock);
      const answered = await transfers.answer({
        actor,
        campaignId,
        id: transfer.id,
        status: TransferStatus.Accepted,
      });
      if (!answered) {
        throw new ConflictError(
          `Transfer ${transfer.id} was already answered`,
          message(ItemTransferMessage.NotPending),
        );
      }
      const handover = {
        from: CharacterId.parse(transfer.from),
        to: CharacterId.parse(transfer.to),
        giverVersion: transfer.giverVersion,
      };
      const refusal = isCoinTransfer(transfer)
        ? await settlement.giveCoins(actor, { ...handover, coins: CoinsSchema.parse(transfer.coins) })
        : await settlement.giveLine(actor, { ...handover, item: InventoryItemId.parse(transfer.item) });
      if (refusal !== undefined) {
        throw refused(refusal, transfer);
      }
    });
  }
}
