import { CharacterCommand, giveLine, itemContent } from '@pioneer/character/domain';
import type {
  Character,
  CharacterId,
  Inventory,
  InventoryItem,
  InventoryItemId,
  InventoryTransfer,
  TransferRefusal,
} from '@pioneer/character/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { contentOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import type { CharacterRepository } from './character-repository';

/** A stash line with the name it is shown by. */
export interface StashLineName {
  readonly id: InventoryItemId;
  readonly name: string;
  readonly quantity: InventoryItem['quantity'];
  readonly container: InventoryItemId | undefined;
}

/** The line a character puts in, or takes out, of the stash. */
export interface StashLine {
  readonly character: CharacterId;
  readonly item: InventoryItemId;
}

/** The stash after a move, or the reason the move cannot happen. */
export type StashMove =
  { readonly refusal: undefined; readonly stash: Inventory } | { readonly refusal: TransferRefusal };

/** Which side of a `giveLine` the character is, and so which side the stash is. */
const Side = { Giver: 'giver', Recipient: 'recipient' } as const;
type Side = (typeof Side)[keyof typeof Side];

/** A `giveLine` result, and the side of it the character is. */
interface Settled {
  readonly moved: InventoryTransfer;
  readonly side: Side;
}

const OTHER_SIDE = { [Side.Giver]: Side.Recipient, [Side.Recipient]: Side.Giver } as const;

/**
 * Moves lines between a character and the party stash (ADR-0064). The stash is an `Inventory` the campaign context
 * keeps; it belongs to no character, so what it holds adds Bulk to no one. The character is written at the version
 * read now, and the caller saves the stash in the same transaction, so a conflict on either leaves both as they were.
 * Framework-free, like `CharacterTransferSettlement`.
 */
export class CharacterPartyStash {
  readonly #characters: CharacterRepository;
  readonly #content: CharacterContentSource;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, content: CharacterContentSource, clock: Clock) {
    this.#characters = characters;
    this.#content = content;
    this.#clock = clock;
  }

  /** Moves the character's line, and what it holds, into the stash. */
  public async deposit(actor: UserId, { character, item }: StashLine, stash: Inventory): Promise<StashMove> {
    const found = await this.#found(character);
    const moved = giveLine(found.document.inventory, stash, item);
    return this.#write(actor, found, { moved, side: Side.Giver });
  }

  /** Moves the stash's line, and what it holds, into the character's inventory. */
  public async take(actor: UserId, { character, item }: StashLine, stash: Inventory): Promise<StashMove> {
    const found = await this.#found(character);
    const moved = giveLine(stash, found.document.inventory, item);
    return this.#write(actor, found, { moved, side: Side.Recipient });
  }

  /** The stash's lines named from the content of `via`, one of the campaign's characters; item ids when there is none. */
  public async name(stash: Inventory, via: CharacterId | undefined): Promise<readonly StashLineName[]> {
    const character = via === undefined ? undefined : await this.#characters.findById(via);
    const items =
      character === undefined ? undefined : itemContent(await contentOfCharacter(this.#content, character).registry());
    return stash.items.map((each) => ({
      id: each.id,
      name: each.name ?? items?.get(each.item)?.name ?? each.item,
      quantity: each.quantity,
      container: each.container,
    }));
  }

  async #write(actor: UserId, character: Character, { moved, side }: Settled): Promise<StashMove> {
    if (moved.refusal !== undefined) {
      return { refusal: moved.refusal };
    }
    const changed = character.withInventory(moved[side], this.#clock.now());
    await this.#characters.update(changed, character.version, { actor, command: CharacterCommand.MoveToPartyStash });
    return { refusal: undefined, stash: moved[OTHER_SIDE[side]] };
  }

  async #found(id: CharacterId): Promise<Character> {
    const character = await this.#characters.findById(id);
    if (character === undefined) {
      throw new NotFoundError('Character', id);
    }
    return character;
  }
}
