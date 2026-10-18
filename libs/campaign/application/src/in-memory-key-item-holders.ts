import { KeyItemName, KeyItemRunes, ReviewedName } from '@pioneer/campaign/domain';
import type { CampaignKeyItem, CharacterId, KeyItemId, ReviewedItemId } from '@pioneer/campaign/domain';
import { ConflictError, NotFoundError } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { KeyItemHolders } from './key-item-holders';
import type { LineLink, LineToPromote } from './key-item-holders';

/** Adapter for tests: the key items each character holds a line of, as the character context would keep them. */
export class InMemoryKeyItemHolders extends KeyItemHolders {
  readonly #lines = new Map<CharacterId, Set<KeyItemId>>();
  readonly #inventory = new Map<ReviewedItemId, { character: CharacterId; line: LineToPromote }>();
  readonly #actors: UserId[] = [];

  /** The key items the character has a line of. */
  public linesOf(character: CharacterId): readonly KeyItemId[] {
    return [...(this.#lines.get(character) ?? [])];
  }

  /** Every actor that wrote a line, oldest first. */
  public get actors(): readonly UserId[] {
    return this.#actors;
  }

  /** The character has this plain inventory line, which a key item can be made from. */
  public hasLine(character: CharacterId, item: ReviewedItemId, line: Partial<LineToPromote> = {}): this {
    this.#inventory.set(item, {
      character,
      line: {
        name: KeyItemName.parse('Longsword'),
        base: { item: line.base?.item ?? item, name: ReviewedName.parse('Longsword') },
        runes: KeyItemRunes.parse({}),
        keyItem: undefined,
        ...line,
      },
    });
    return this;
  }

  /** The key item the character's line is linked to, if it is. */
  public linkOf(item: ReviewedItemId): KeyItemId | undefined {
    return this.#inventory.get(item)?.line.keyItem;
  }

  public override async give(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void> {
    this.#actors.push(actor);
    this.#lines.set(character, new Set([...(this.#lines.get(character) ?? []), keyItem.id]));
  }

  public override async takeBack(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void> {
    this.#actors.push(actor);
    this.#lines.get(character)?.delete(keyItem.id);
  }

  public override async describe(character: CharacterId, item: ReviewedItemId): Promise<LineToPromote | undefined> {
    const found = this.#inventory.get(item);
    return found?.character === character ? found.line : undefined;
  }

  public override async link(actor: UserId, character: CharacterId, { item, keyItem }: LineLink): Promise<void> {
    const found = this.#inventory.get(item);
    if (found?.character !== character) {
      throw new NotFoundError('InventoryItem', item);
    }
    if (found.line.keyItem === keyItem) {
      return;
    }
    if (found.line.keyItem !== undefined) {
      throw new ConflictError(`Inventory item ${item} is already a key item`);
    }
    this.#actors.push(actor);
    this.#inventory.set(item, { character, line: { ...found.line, keyItem } });
    this.#lines.set(character, new Set([...(this.#lines.get(character) ?? []), keyItem]));
  }
}
