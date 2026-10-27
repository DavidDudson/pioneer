import { CharacterCommand, giveCoins, giveLine } from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  Coins,
  Inventory,
  InventoryItemId,
  InventoryTransfer,
  TransferRefusal,
} from '@pioneer/character/domain';
import { NotFoundError, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, UserId, Version } from '@pioneer/shared/kernel';

import type { CharacterRepository } from './character-repository';

/** A character to write and the version it was read at. */
interface Write {
  readonly character: Character;
  readonly expected: Version;
}

/**
 * The two writes in character id order, so two offers crossing between the same pair of characters lock the rows alike
 * and cannot deadlock.
 */
function inIdOrder(left: Write, right: Write): readonly [Write, Write] {
  return left.character.id.localeCompare(right.character.id) <= 0 ? [left, right] : [right, left];
}

/** What moves between two characters, and the giver's version the offer was made at. */
interface Handover {
  readonly from: CharacterId;
  readonly to: CharacterId;
  /** The giver's version when the offer was made: a giver changed since makes the whole handover a conflict. */
  readonly giverVersion: Version;
}

/** A line, with what it holds, going from the giver to the recipient. */
export interface LineHandover extends Handover {
  readonly item: InventoryItemId;
}

/** Coins going from the giver to the recipient. */
export interface CoinHandover extends Handover {
  readonly coins: Coins;
}

/**
 * Writes what an accepted offer moves between two characters: the giver's side at the version the offer was made at,
 * the recipient's at the version read now. The adapter that calls it runs both writes in one transaction, so a
 * conflict on either side leaves both characters as they were. Framework-free.
 */
export class CharacterTransferSettlement {
  readonly #characters: CharacterRepository;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, clock: Clock) {
    this.#characters = characters;
    this.#clock = clock;
  }

  /** Moves the line and what it holds; the reason it cannot move, or none once both characters are written. */
  public async giveLine(actor: UserId, { item, ...handover }: LineHandover): Promise<TransferRefusal | undefined> {
    return this.#settle(actor, handover, (giver, recipient) => giveLine(giver, recipient, item));
  }

  /** Moves the coins; the reason they cannot move, or none once both characters are written. */
  public async giveCoins(actor: UserId, { coins, ...handover }: CoinHandover): Promise<TransferRefusal | undefined> {
    return this.#settle(actor, handover, (giver, recipient) => giveCoins(giver, recipient, coins));
  }

  async #settle(
    actor: UserId,
    { from, to, giverVersion }: Handover,
    move: (giver: Inventory, recipient: Inventory) => InventoryTransfer,
  ): Promise<TransferRefusal | undefined> {
    const giver = await this.#found(from);
    const recipient = await this.#found(to);
    if (giver.version !== giverVersion) {
      throw new VersionConflictError('Character', from);
    }
    const moved = move(giver.document.inventory, recipient.document.inventory);
    if (moved.refusal !== undefined) {
      return moved.refusal;
    }
    const now = this.#clock.now();
    const giverWrite = { character: giver.withInventory(moved.giver, now), expected: giver.version };
    const recipientWrite = { character: recipient.withInventory(moved.recipient, now), expected: recipient.version };
    await this.#write(actor, inIdOrder(giverWrite, recipientWrite));
    return undefined;
  }

  async #write(actor: UserId, [first, second]: readonly [Write, Write]): Promise<void> {
    const audit = { actor, command: CharacterCommand.AcceptTransfer };
    await this.#characters.update(first.character, first.expected, audit);
    await this.#characters.update(second.character, second.expected, audit);
  }

  async #found(id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }
}
