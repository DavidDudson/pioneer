import type { CharacterId, InventoryItemId } from '@pioneer/character/domain';
import type { Version } from '@pioneer/shared/kernel';

import type { CharacterRepository } from './character-repository';

/** An inventory line as an offer sees it: whether it is a key item's, and the character's version now. */
export interface TransferLine {
  readonly keyItem: boolean;
  readonly version: Version;
}

/**
 * Reads the lines a campaign's members offer to each other. Like `CharacterKeyItemPromotion`, who may ask is the
 * campaign context's policy. Framework-free.
 */
export class CharacterTransferLines {
  readonly #characters: CharacterRepository;

  public constructor(characters: CharacterRepository) {
    this.#characters = characters;
  }

  /** The line and the character's version; none when the character or the line is gone. */
  public async describe(characterId: CharacterId, item: InventoryItemId): Promise<TransferLine | undefined> {
    const character = await this.#characters.findById(characterId);
    const line = character?.document.inventory.items.find((each) => each.id === item);
    if (character === undefined || line === undefined) {
      return undefined;
    }
    return { keyItem: line.keyItem !== undefined, version: character.version };
  }
}
