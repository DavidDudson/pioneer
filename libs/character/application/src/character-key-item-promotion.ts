import { CharacterCommand, itemContent, keyItemLine, runeContent, withKeyLink } from '@pioneer/character/domain';
import type { CharacterId, InventoryItemId, ItemRunes, KeyItemId } from '@pioneer/character/domain';
import type { ContentId } from '@pioneer/rules/sdk';
import { ConflictError, NotFoundError } from '@pioneer/shared/kernel';
import type { Clock, UserId } from '@pioneer/shared/kernel';

import { contentOfCharacter } from './character-content';
import type { CharacterContentSource } from './character-content';
import type { CharacterRepository } from './character-repository';

/** A property rune on a line, with the name the campaign shows for it. */
interface PromotableRune {
  readonly rune: ContentId;
  readonly name: string;
}

/** A line and the key item it becomes the holder copy of. */
export interface KeyLink {
  readonly item: InventoryItemId;
  readonly keyItem: KeyItemId;
}

/** An inventory line as a key item copies it: the base item, the name the line shows, and the runes with their names. */
export interface PromotableLine {
  readonly item: ContentId;
  readonly itemName: string;
  readonly name: string;
  readonly runes: ItemRunes | undefined;
  readonly property: readonly PromotableRune[];
  /** The key item the line is already linked to, if any. */
  readonly keyItem: KeyItemId | undefined;
}

/**
 * Turns a line a character already has into a key item's holder copy (ADR-0064): reads what the key item copies, and
 * links the line to the key item without adding a second one. Like `CharacterKeyItems`, the GM is not the owner, so the
 * campaign context checks who may ask. Framework-free.
 */
export class CharacterKeyItemPromotion {
  readonly #characters: CharacterRepository;
  readonly #content: CharacterContentSource;
  readonly #clock: Clock;

  public constructor(characters: CharacterRepository, content: CharacterContentSource, clock: Clock) {
    this.#characters = characters;
    this.#content = content;
    this.#clock = clock;
  }

  /** What a key item copies from the line; none when the character or the line is gone. */
  public async describe(characterId: CharacterId, item: InventoryItemId): Promise<PromotableLine | undefined> {
    const character = await this.#characters.findById(characterId);
    const line = character?.document.inventory.items.find((each) => each.id === item);
    if (character === undefined || line === undefined) {
      return undefined;
    }
    const registry = await contentOfCharacter(this.#content, character).registry();
    const items = itemContent(registry);
    const runes = runeContent(registry);
    const itemName = items.get(line.item)?.name ?? line.item;
    return {
      item: line.item,
      itemName,
      name: line.name ?? itemName,
      runes: line.runes,
      property: (line.runes?.property ?? []).map((rune) => ({ rune, name: runes.get(rune)?.name ?? rune })),
      keyItem: line.keyItem,
    };
  }

  /**
   * Links the line to the key item. A line already linked to it is no change; one linked to another key item is a
   * conflict, and one that is gone a 404.
   */
  public async link(actor: UserId, characterId: CharacterId, { item, keyItem }: KeyLink): Promise<void> {
    const character = await this.#characters.findById(characterId);
    const line = character?.document.inventory.items.find((each) => each.id === item);
    if (character === undefined || line === undefined) {
      throw new NotFoundError('InventoryItem', item);
    }
    if (line.keyItem === keyItem) {
      return;
    }
    const { inventory } = character.document;
    if (line.keyItem !== undefined || keyItemLine(inventory, keyItem) !== undefined) {
      throw new ConflictError(`Inventory item ${item} is already a key item`);
    }
    const changed = character.withInventory(withKeyLink(inventory, item, keyItem), this.#clock.now());
    await this.#characters.update(changed, character.version, { actor, command: CharacterCommand.LinkKeyItem });
  }
}
