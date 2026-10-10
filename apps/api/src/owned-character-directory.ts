import { CharacterDirectory } from '@pioneer/campaign/application';
import type { CharacterSummary } from '@pioneer/campaign/application';
import { CharacterId, PartyCharacterLevel, PartyCharacterName } from '@pioneer/campaign/domain';
import { characters } from '@pioneer/character/infrastructure';
import type { UserId } from '@pioneer/shared/kernel';
import { asc, eq, inArray } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

/** The columns a summary is read from. */
const SUMMARY = { id: characters.id, ownerId: characters.ownerId, name: characters.name, level: characters.level };

interface SummaryRow {
  readonly id: string;
  readonly ownerId: UserId;
  readonly name: string;
  readonly level: number;
}

function toSummary(row: SummaryRow): CharacterSummary {
  return {
    id: CharacterId.parse(row.id),
    ownerId: row.ownerId,
    name: PartyCharacterName.parse(row.name),
    level: PartyCharacterLevel.parse(row.level),
  };
}

/**
 * Campaign's `CharacterDirectory` over the character context's table. It lives in the composition
 * root because neither context may import the other.
 */
export class OwnedCharacterDirectory extends CharacterDirectory {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async ownedBy(userId: UserId): Promise<readonly CharacterSummary[]> {
    const rows = await this.#db
      .select(SUMMARY)
      .from(characters)
      .where(eq(characters.ownerId, userId))
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
}
