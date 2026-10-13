import { CharacterSort } from '@pioneer/character/domain';
import type { Character, CharacterId, CharacterListQuery, CharacterPlay, PlayState } from '@pioneer/character/domain';
import { FIRST_VERSION, nextVersion, SortDirection, VersionConflictError } from '@pioneer/shared/kernel';
import type { UserId, Version } from '@pioneer/shared/kernel';

import { CharacterRepository } from './character-repository';
import type { CharacterAudit, PlayWrite } from './character-repository';

/** Repository adapter for tests and local experiments. Play state is kept apart, as `character_play` keeps it. */
export class InMemoryCharacterRepository extends CharacterRepository {
  readonly #rows = new Map<CharacterId, Character>();
  readonly #plays = new Map<CharacterId, CharacterPlay>();
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
      .toSorted((left, right) => sign * (key(left).localeCompare(key(right)) || left.id.localeCompare(right.id)))
      .map((character) => this.#withPlay(character));
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    const character = this.#rows.get(id);
    return character === undefined ? undefined : this.#withPlay(character);
  }

  public override async insert(character: Character, audit: CharacterAudit): Promise<Character> {
    this.#rows.set(character.id, character);
    this.#plays.set(character.id, { revision: FIRST_VERSION, play: character.document.play });
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
    return this.#withPlay(saved);
  }

  public override async findPlay(id: CharacterId): Promise<CharacterPlay | undefined> {
    return this.#plays.get(id);
  }

  public override async updatePlay(
    id: CharacterId,
    play: PlayState,
    expectedRevision: Version,
    { audit }: PlayWrite,
  ): Promise<CharacterPlay> {
    const stored = this.#plays.get(id);
    if (stored?.revision !== expectedRevision) {
      throw new VersionConflictError('CharacterPlay', id);
    }
    const saved = { revision: nextVersion(expectedRevision), play };
    this.#plays.set(id, saved);
    this.#audits.push(audit);
    return saved;
  }

  /** `character` with the play state stored apart from it, as a read gives it: a build save never writes play state. */
  #withPlay(character: Character): Character {
    const stored = this.#plays.get(character.id);
    return stored === undefined ? character : character.withPlay(stored.play);
  }
}
