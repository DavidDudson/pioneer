import {
  CHARACTER_FILTER_PROPERTIES,
  CHARACTER_PAGE_SIZE,
  CharacterCount,
  CharacterSort,
  withPlay,
} from '@pioneer/character/domain';
import type {
  Character,
  CharacterFacetQuery,
  CharacterFilterProperty,
  CharacterId,
  CharacterListQuery,
  CharacterPage,
  CharacterPageQuery,
  CharacterPlay,
} from '@pioneer/character/domain';
import {
  conditionHolds,
  FACET_PAGE_SIZE,
  FIRST_VERSION,
  nextVersion,
  otherConditions,
  SortDirection,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import type {
  FacetCount,
  FacetPage,
  FilterCondition,
  FilterKind,
  FilterProperties,
  FilterValue,
  Temporal,
  UserId,
  Version,
} from '@pioneer/shared/kernel';

import { CharacterRepository } from './character-repository';
import type { CharacterAudit, PlayWrite } from './character-repository';

const KINDS: FilterProperties = CHARACTER_FILTER_PROPERTIES;

/** What each filterable property reads from a character. */
const READ = {
  name: (character) => character.name,
  level: (character) => character.level,
  class: (character) => character.classId,
  ancestry: (character) => character.ancestry,
} as const satisfies Readonly<Record<CharacterFilterProperty, (character: Character) => FilterValue>>;

function readProperty(property: string, character: Character): FilterValue {
  return new Map<string, (character: Character) => FilterValue>(Object.entries(READ)).get(property)?.(character);
}

/** Whether `character` passes every condition; no conditions pass all. */
function matches(character: Character, conditions: ReadonlyArray<FilterCondition>): boolean {
  return conditions.every((condition) => {
    const kind: FilterKind | undefined = KINDS[condition.property];

    return kind !== undefined && conditionHolds(kind, condition, readProperty(condition.property, character));
  });
}

/** Repository adapter for tests and local experiments. Play state is kept apart, as `character_play` keeps it. */
export class InMemoryCharacterRepository extends CharacterRepository {
  readonly #rows = new Map<CharacterId, Character>();
  readonly #plays = new Map<CharacterId, CharacterPlay>();
  readonly #audits: Array<CharacterAudit> = [];
  readonly #archived = new Set<CharacterId>();

  /** Every write's audit context, oldest first, for tests to assert which command ran. */
  public get audits(): ReadonlyArray<CharacterAudit> {
    return this.#audits;
  }

  public override async listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<ReadonlyArray<Character>> {
    return this.#listFor(ownerId, query, false);
  }

  public override async pageForOwner(ownerId: UserId, query: CharacterPageQuery): Promise<CharacterPage> {
    const matching = this.#listFor(ownerId, query, false).filter((character) => matches(character, query.filters));
    const start = (query.page - 1) * CHARACTER_PAGE_SIZE;

    return {
      items: matching.slice(start, start + CHARACTER_PAGE_SIZE),
      total: CharacterCount.parse(matching.length),
      page: query.page,
      pageSize: CHARACTER_PAGE_SIZE,
    };
  }

  public override async facetsForOwner(ownerId: UserId, query: CharacterFacetQuery): Promise<FacetPage> {
    const others = otherConditions(query.filters, query.property);
    const search = query.search?.toLowerCase();
    const counts = new Map<string, number>();

    for (const character of this.#listFor(
      ownerId,
      { sort: CharacterSort.CreatedAt, direction: SortDirection.Asc },
      false,
    )) {
      const value = readProperty(query.property, character);

      if (value !== undefined && matches(character, others)) {
        counts.set(String(value), (counts.get(String(value)) ?? 0) + 1);
      }
    }

    const values = [...counts]
      .flatMap(([value, count]): Array<FacetCount> =>
        search === undefined || value.toLowerCase().includes(search) ? [{ value, count }] : [],
      )
      .toSorted((left, right) => right.count - left.count || left.value.localeCompare(right.value));

    const start = (query.page - 1) * FACET_PAGE_SIZE;

    return {
      items: values.slice(start, start + FACET_PAGE_SIZE),
      total: values.length,
      page: query.page,
      pageSize: FACET_PAGE_SIZE,
    };
  }

  public override async listArchivedForOwner(
    ownerId: UserId,
    query: CharacterListQuery,
  ): Promise<ReadonlyArray<Character>> {
    return this.#listFor(ownerId, query, true);
  }

  #listFor(ownerId: UserId, query: CharacterListQuery, archived: boolean): ReadonlyArray<Character> {
    const sign = query.direction === SortDirection.Asc ? 1 : -1;

    const key = (character: Character): string =>
      query.sort === CharacterSort.Name ? character.name : character.createdAt.toString();

    return [...this.#rows.values()]
      .filter((character) => character.ownerId === ownerId && this.#archived.has(character.id) === archived)
      .toSorted((left, right) => sign * (key(left).localeCompare(key(right)) || left.id.localeCompare(right.id)))
      .map((character) => this.#withPlay(character));
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    const character = this.#rows.get(id);

    return character === undefined || this.#archived.has(id) ? undefined : this.#withPlay(character);
  }

  public override async findOwner(id: CharacterId): Promise<UserId | undefined> {
    return this.#archived.has(id) ? undefined : this.#rows.get(id)?.ownerId;
  }

  public override async findByIds(ids: ReadonlyArray<CharacterId>): Promise<ReadonlyArray<Character>> {
    return [...new Set(ids)].flatMap((id): Array<Character> => {
      const character = this.#rows.get(id);

      return character === undefined || this.#archived.has(id) ? [] : [this.#withPlay(character)];
    });
  }

  public override async findArchivedById(id: CharacterId): Promise<Character | undefined> {
    const character = this.#rows.get(id);

    return character === undefined || !this.#archived.has(id) ? undefined : this.#withPlay(character);
  }

  public override async archive(id: CharacterId, _now: Temporal.Instant, audit: CharacterAudit): Promise<void> {
    this.#archived.add(id);
    this.#audits.push(audit);
  }

  public override async restore(id: CharacterId, audit: CharacterAudit): Promise<void> {
    this.#archived.delete(id);
    this.#audits.push(audit);
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

  public override async updatePlay({ id, play, expectedRevision, audit }: PlayWrite): Promise<CharacterPlay> {
    const stored = this.#plays.get(id);

    if (stored?.revision !== expectedRevision) {
      throw new VersionConflictError('CharacterPlay', id);
    }

    const saved = { revision: nextVersion(expectedRevision), play };
    this.#plays.set(id, saved);
    this.#audits.push(audit);

    return saved;
  }

  public override async updatePlayAndCharacter(
    write: PlayWrite,
    character: Character,
    expectedVersion: Version,
  ): Promise<CharacterPlay> {
    if (this.#rows.get(character.id)?.version !== expectedVersion) {
      throw new VersionConflictError('Character', character.id);
    }

    const saved = await this.updatePlay(write);
    this.#rows.set(character.id, character.withVersion(nextVersion(expectedVersion)));

    return saved;
  }

  /** `character` with the play state stored apart from it, as a read gives it: a build save never writes play state. */
  #withPlay(character: Character): Character {
    const stored = this.#plays.get(character.id);

    return stored === undefined ? character : withPlay(character, stored.play);
  }
}
