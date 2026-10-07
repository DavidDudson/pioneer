import type { Character, CharacterId, CharacterListQuery } from '@pioneer/character/domain';
import type { Version } from '@pioneer/shared/kernel';

/**
 * Port for character persistence. Adapters live in
 * `character-infrastructure`; `InMemoryCharacterRepository` is for tests.
 */
export abstract class CharacterRepository {
  /** Sorted by an enumerated, indexed option; `id` breaks ties so pages are stable. */
  public abstract list(query: CharacterListQuery): Promise<readonly Character[]>;

  public abstract findById(id: CharacterId): Promise<Character | undefined>;

  /** Insert a new character at version 1. */
  public abstract insert(character: Character): Promise<Character>;

  /**
   * Persist `character` only if the stored version is still `expectedVersion`;
   * returns it at `expectedVersion + 1`. Throws `VersionConflictError` otherwise.
   */
  public abstract update(character: Character, expectedVersion: Version): Promise<Character>;
}
