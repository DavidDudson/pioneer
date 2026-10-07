import type { Character, CharacterId } from '@pioneer/character/domain';
import { VersionConflictError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';

import { CharacterRepository } from './character-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCharacterRepository extends CharacterRepository {
  readonly #rows = new Map<CharacterId, Character>();

  public override async list(): Promise<readonly Character[]> {
    return [...this.#rows.values()];
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    return this.#rows.get(id);
  }

  public override async insert(character: Character): Promise<Character> {
    this.#rows.set(character.id, character);
    return character;
  }

  public override async update(character: Character, expectedVersion: Version): Promise<Character> {
    const stored = this.#rows.get(character.id);
    if (stored?.version !== expectedVersion) {
      throw new VersionConflictError('Character', character.id);
    }
    const saved = character.withVersion(expectedVersion + 1);
    this.#rows.set(saved.id, saved);
    return saved;
  }
}
