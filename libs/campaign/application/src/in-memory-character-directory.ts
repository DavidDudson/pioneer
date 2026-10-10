import { CharacterId, PartyCharacterLevel, PartyCharacterName } from '@pioneer/campaign/domain';
import type { UserId } from '@pioneer/shared/kernel';

import { CharacterDirectory } from './character-directory';
import type { CharacterSummary } from './character-directory';

/** A character as a test describes it. */
interface CharacterFixture {
  readonly id: string;
  readonly ownerId: UserId;
  readonly name: string;
  readonly level?: number;
}

/** Directory adapter for tests: characters given up front. */
export class InMemoryCharacterDirectory extends CharacterDirectory {
  readonly #characters = new Map<CharacterId, CharacterSummary>();

  /** Adds a character, at level 1 unless given. */
  public character({ id, ownerId, name, level = 1 }: CharacterFixture): this {
    const characterId = CharacterId.parse(id);
    this.#characters.set(characterId, {
      id: characterId,
      ownerId,
      name: PartyCharacterName.parse(name),
      level: PartyCharacterLevel.parse(level),
    });
    return this;
  }

  public override async ownedBy(userId: UserId): Promise<readonly CharacterSummary[]> {
    return [...this.#characters.values()]
      .filter((character) => character.ownerId === userId)
      .toSorted((left, right) => left.name.localeCompare(right.name) || left.id.localeCompare(right.id));
  }

  public override async byIds(ids: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, CharacterSummary>> {
    return new Map(
      ids.flatMap((id): [CharacterId, CharacterSummary][] => {
        const character = this.#characters.get(id);
        return character === undefined ? [] : [[id, character]];
      }),
    );
  }
}
