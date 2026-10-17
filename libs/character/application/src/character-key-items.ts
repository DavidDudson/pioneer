import { CharacterCommand, keyItemLine, withKeyItem, withoutKeyItem } from '@pioneer/character/domain';
import type { CharacterId, KeyItemId, KeyItemLine } from '@pioneer/character/domain';
import { NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import type { CharacterRepository } from './character-repository';

/**
 * The lines a campaign's GM writes into other players' inventories for its key items (ADR-0064): giving adds the
 * holder's copy, taking back removes it. The GM is not the character's owner, so no owner check is made here; the
 * campaign context checks that the actor runs the campaign and that the character is in its party. Framework-free.
 */
export class CharacterKeyItems {
  readonly #characters: CharacterRepository;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, clock: Clock) {
    this.#characters = characters;
    this.#clock = clock;
  }

  /** Adds the key item's line to the character's inventory, stowed; one it already has is left as it is. */
  public async give(actor: UserId, characterId: CharacterId, line: KeyItemLine): Promise<void> {
    const character = await this.#characters.findById(characterId);
    if (character === undefined) {
      throw new NotFoundError('Character', characterId);
    }
    const { inventory } = character.document;
    if (keyItemLine(inventory, line.keyItem) !== undefined) {
      return;
    }
    const changed = character.withInventory(withKeyItem(inventory, line), this.#clock.now());
    await this.#characters.update(changed, character.version, { actor, command: CharacterCommand.GiveKeyItem });
  }

  /** Removes the key item's line from the character's inventory; a character without one is no change. */
  public async takeBack(actor: UserId, characterId: CharacterId, keyItem: KeyItemId): Promise<void> {
    const character = await this.#characters.findById(characterId);
    if (character === undefined) {
      return;
    }
    const { inventory } = character.document;
    if (keyItemLine(inventory, keyItem) === undefined) {
      return;
    }
    const changed = character.withInventory(withoutKeyItem(inventory, keyItem), this.#clock.now());
    await this.#characters.update(changed, character.version, { actor, command: CharacterCommand.TakeBackKeyItem });
  }
}
