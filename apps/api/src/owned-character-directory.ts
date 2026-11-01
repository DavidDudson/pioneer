import { CharacterDirectory } from '@pioneer/campaign/application';
import type { CharacterSummary } from '@pioneer/campaign/application';
import {
  CharacterId,
  PartyCharacterLevel,
  PartyCharacterName,
  PartyCharacterOrigin,
  PartyVitals,
} from '@pioneer/campaign/domain';
import type { CharacterVitals } from '@pioneer/character/application';
import { characters, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import type { UserId } from '@pioneer/shared/kernel';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/** The columns a summary is read from. */
const SUMMARY = {
  id: characters.id,
  ownerId: characters.ownerId,
  name: characters.name,
  level: characters.level,
  archivedAt: characters.archivedAt,
  ancestry: sql<string | null>`${characters.document} -> 'build' -> 'choices' ->> 'ancestry'`,
  class: sql<string | null>`${characters.document} -> 'build' -> 'choices' ->> 'class'`,
};

interface SummaryRow {
  readonly id: string;
  readonly ownerId: UserId;
  readonly name: string;
  readonly level: number;
  readonly archivedAt: string | null;
  readonly ancestry: string | null;
  readonly class: string | null;
}

/** A picked entry as a field of the summary; a slot that is empty, or holds something that is no entry id, is left out. */
function originOf(
  slot: 'ancestry' | 'class',
  value: string | null,
): Partial<Record<typeof slot, PartyCharacterOrigin>> {
  const parsed = PartyCharacterOrigin.safeParse(value);
  return parsed.success ? { [slot]: parsed.data } : {};
}

function toSummary(row: SummaryRow): CharacterSummary {
  return {
    id: CharacterId.parse(row.id),
    ownerId: row.ownerId,
    name: PartyCharacterName.parse(row.name),
    level: PartyCharacterLevel.parse(row.level),
    archived: row.archivedAt !== null,
    ...originOf('ancestry', row.ancestry),
    ...originOf('class', row.class),
  };
}

/**
 * Campaign's `CharacterDirectory` over the character context's table. It lives in the composition
 * root because neither context may import the other.
 */
export class OwnedCharacterDirectory extends CharacterDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;
  readonly #repository: DrizzleCharacterRepository;
  readonly #vitals: CharacterVitals;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>, vitals: CharacterVitals) {
    super();
    this.#db = db;
    this.#repository = new DrizzleCharacterRepository(db);
    this.#vitals = vitals;
  }

  public override async ownedBy(userId: UserId): Promise<readonly CharacterSummary[]> {
    const rows = await this.#db
      .select(SUMMARY)
      .from(characters)
      .where(and(eq(characters.ownerId, userId), isNull(characters.archivedAt)))
      .orderBy(asc(characters.name), asc(characters.id));
    return rows.map((row) => toSummary(row));
  }

  public override async byIds(ids: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, CharacterSummary>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await this.#db
      .select(SUMMARY)
      .from(characters)
      .where(inArray(characters.id, [...ids]));
    return new Map(rows.map((row) => [CharacterId.parse(row.id), toSummary(row)]));
  }

  public override async vitalsOf(ids: readonly CharacterId[]): Promise<ReadonlyMap<CharacterId, PartyVitals>> {
    const found = await Promise.all(ids.map(async (id) => this.#repository.findById(id)));
    const seen = await Promise.all(
      found.map(async (character) => (character === undefined ? undefined : this.#vitals.of(character))),
    );
    return new Map(
      ids.flatMap((id, index): [CharacterId, PartyVitals][] => {
        const vitals = seen[index];
        return vitals === undefined ? [] : [[id, PartyVitals.parse(vitals)]];
      }),
    );
  }
}
