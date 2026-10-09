import type { Character, CharacterId, CharacterListQuery } from '@pioneer/character/domain';
import type { UserId, Version } from '@pioneer/shared/kernel';

/**
 * Port for character persistence. Adapters live in
 * `character-infrastructure`; `InMemoryCharacterRepository` is for tests.
 */
export abstract class CharacterRepository {
  /**
   * One owner's characters, sorted by an enumerated, indexed option; `id` breaks ties so pages
   * are stable.
   */
  public abstract listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]>;

  /** Any owner's; the service applies the access policy. */
  public abstract findById(id: CharacterId): Promise<Character | undefined>;

  /** Insert a new character at version 1. */
  public abstract insert(character: Character): Promise<Character>;

  /**
   * Persist `character` only if the stored version is still `expectedVersion`;
   * returns it at `expectedVersion + 1`. Throws `VersionConflictError` otherwise.
   */
  public abstract update(character: Character, expectedVersion: Version): Promise<Character>;
}
