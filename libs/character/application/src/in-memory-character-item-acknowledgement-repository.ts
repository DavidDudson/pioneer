import type { CharacterId, ItemAcknowledgement } from '@pioneer/character/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterItemAcknowledgementRepository } from './character-item-acknowledgement-repository';
import type { ItemAcknowledgementRevocation } from './character-item-acknowledgement-repository';

/** The same line: the same item, rule and, for a rune not allowed, rune. */
function sameLine(left: ItemAcknowledgement, right: ItemAcknowledgement): boolean {
  return left.item === right.item && left.rule === right.rule && left.rune === right.rune;
}

/** Repository adapter for tests and local experiments. */
export class InMemoryCharacterItemAcknowledgementRepository extends CharacterItemAcknowledgementRepository {
  readonly #rows = new Map<CharacterId, readonly ItemAcknowledgement[]>();

  public override async listForCharacter(characterId: CharacterId): Promise<readonly ItemAcknowledgement[]> {
    return this.#rows.get(characterId) ?? [];
  }

  public override async acknowledge(
    _actor: UserId,
    characterId: CharacterId,
    acknowledgement: ItemAcknowledgement,
  ): Promise<void> {
    const kept = (this.#rows.get(characterId) ?? []).filter((each) => !sameLine(each, acknowledgement));
    this.#rows.set(characterId, [...kept, acknowledgement]);
  }

  public override async revoke(
    _actor: UserId,
    characterId: CharacterId,
    { id }: ItemAcknowledgementRevocation,
  ): Promise<void> {
    this.#rows.set(
      characterId,
      (this.#rows.get(characterId) ?? []).filter((each) => each.id !== id),
    );
  }
}
