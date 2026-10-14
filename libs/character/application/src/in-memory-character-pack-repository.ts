import type { CharacterId, CharacterPack } from '@pioneer/character/domain';
import type { ContentPackId } from '@pioneer/rules/sdk';
import { Temporal } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterPackRepository } from './character-pack-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCharacterPackRepository extends CharacterPackRepository {
  readonly #rows = new Map<CharacterId, CharacterPack[]>();

  public override async listForCharacter(characterId: CharacterId): Promise<readonly CharacterPack[]> {
    return (this.#rows.get(characterId) ?? []).toSorted(
      (left, right) => Temporal.Instant.compare(left.enabledAt, right.enabledAt) || left.id.localeCompare(right.id),
    );
  }

  public override async enable(
    _actor: UserId,
    characterId: CharacterId,
    packs: readonly CharacterPack[],
  ): Promise<void> {
    const rows = this.#rows.get(characterId) ?? [];
    const fresh = packs.filter((pack) => !rows.some((row) => row.packId === pack.packId));
    this.#rows.set(characterId, [...rows, ...fresh]);
  }

  public override async disable(_actor: UserId, characterId: CharacterId, packId: ContentPackId): Promise<void> {
    this.#rows.set(
      characterId,
      (this.#rows.get(characterId) ?? []).filter((row) => row.packId !== packId),
    );
  }
}
