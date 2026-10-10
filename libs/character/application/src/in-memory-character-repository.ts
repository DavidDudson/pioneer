import { CharacterSort } from '@pioneer/character/domain';
import type { Character, CharacterId, CharacterListQuery } from '@pioneer/character/domain';
import { nextVersion, SortDirection, VersionConflictError } from '@pioneer/shared/kernel';
import type { UserId, Version } from '@pioneer/shared/kernel';

import { CharacterRepository } from './character-repository';
import type { CharacterAudit } from './character-repository';

/** Repository adapter for tests and local experiments. */
export class InMemoryCharacterRepository extends CharacterRepository {
  readonly #rows = new Map<CharacterId, Character>();
  readonly #audits: CharacterAudit[] = [];

  /** Every write's audit context, oldest first, for tests to assert which command ran. */
  public get audits(): readonly CharacterAudit[] {
    return this.#audits;
  }

  public override async listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]> {
    const sign = query.direction === SortDirection.Asc ? 1 : -1;
    const key = (character: Character): string =>
      query.sort === CharacterSort.Name ? character.name : character.createdAt.toString();
    return [...this.#rows.values()]
      .filter((character) => character.ownerId === ownerId)
      .toSorted((left, right) => sign * (key(left).localeCompare(key(right)) || left.id.localeCompare(right.id)));
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    return this.#rows.get(id);
  }

  public override async insert(character: Character, audit: CharacterAudit): Promise<Character> {
    this.#rows.set(character.id, character);
    this.#audits.push(audit);
    return character;
  }

  public override async update(
    character: Character,
    expectedVersion: Version,
    audit: CharacterAudit,
  ): Promise<Character> {
    const stored = this.#rows.get(character.id);
    if (stored?.version !== expectedVersion) {
      throw new VersionConflictError('Character', character.id);
    }
    const saved = character.withVersion(nextVersion(expectedVersion));
    this.#rows.set(saved.id, saved);
    this.#audits.push(audit);
    return saved;
  }
}
