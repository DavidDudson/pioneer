import type { CampaignKeyItem, CharacterId, KeyItemId } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { KeyItemHolders } from './key-item-holders';

/** Adapter for tests: the key items each character holds a line of, as the character context would keep them. */
export class InMemoryKeyItemHolders extends KeyItemHolders {
  readonly #lines = new Map<CharacterId, Set<KeyItemId>>();
  readonly #actors: UserId[] = [];

  /** The key items the character has a line of. */
  public linesOf(character: CharacterId): readonly KeyItemId[] {
    return [...(this.#lines.get(character) ?? [])];
  }

  /** Every actor that wrote a line, oldest first. */
  public get actors(): readonly UserId[] {
    return this.#actors;
  }

  public override async give(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void> {
    this.#actors.push(actor);
    this.#lines.set(character, new Set([...(this.#lines.get(character) ?? []), keyItem.id]));
  }

  public override async takeBack(actor: UserId, character: CharacterId, keyItem: CampaignKeyItem): Promise<void> {
    this.#actors.push(actor);
    this.#lines.get(character)?.delete(keyItem.id);
  }
}
