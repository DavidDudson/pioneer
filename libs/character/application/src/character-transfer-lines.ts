import { itemContent } from '@pioneer/character/domain';
import type { CharacterId, Coins, InventoryItemId } from '@pioneer/character/domain';
import type { Version } from '@pioneer/shared/kernel';

import { contentOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import type { CharacterRepository } from './character-repository';

/** An inventory line as an offer sees it: whether it is a key item's, and the character's version now. */
export interface TransferLine {
  readonly keyItem: boolean;
  /** The player's name for the line, else the item's. */
  readonly name: string;
  readonly version: Version;
}

/** A purse as an offer sees it: the coins held, and the character's version now. */
export interface TransferPurse {
  readonly coins: Coins;
  readonly version: Version;
}

/**
 * Reads the lines and coins a campaign's members offer to each other. Like `CharacterKeyItemPromotion`, who may ask is the
 * campaign context's policy. Framework-free.
 */
export class CharacterTransferLines {
  readonly #characters: CharacterRepository;
  readonly #content: CharacterContentSource;

  public constructor(characters: CharacterRepository, content: CharacterContentSource) {
    this.#characters = characters;
    this.#content = content;
  }

  /** The character's purse and version; none when the character is gone. */
  public async purse(characterId: CharacterId): Promise<TransferPurse | undefined> {
    const character = await this.#characters.findById(characterId);
    if (character === undefined) {
      return undefined;
    }
    return { coins: character.document.inventory.coins, version: character.version };
  }

  /** The line and the character's version; none when the character or the line is gone. */
  public async describe(characterId: CharacterId, item: InventoryItemId): Promise<TransferLine | undefined> {
    const character = await this.#characters.findById(characterId);
    const line = character?.document.inventory.items.find((each) => each.id === item);
    if (character === undefined || line === undefined) {
      return undefined;
    }
    const registry = await contentOfCharacter(this.#content, character).registry();
    const name = line.name ?? itemContent(registry).get(line.item)?.name ?? line.item;
    return { keyItem: line.keyItem !== undefined, name, version: character.version };
  }
}
