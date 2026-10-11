import { CharacterRepository } from '@pioneer/character/application';
import type { CharacterAudit } from '@pioneer/character/application';
import { Character, decodeCharacterDocument } from '@pioneer/character/domain';
import type { CharacterId, CharacterListQuery, CharacterSort } from '@pioneer/character/domain';
import { nextVersion, SortDirection, Temporal, VersionConflictError } from '@pioneer/shared/kernel';
import type { UserId, Version } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, asc, desc, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characters } from './character.table';

type Row = typeof characters.$inferSelect;

/**
 * Exhaustive: adding a CharacterSort option without a column (and an index,
 * see character.table.ts) does not compile / fails the plan guard.
 */
const SORT_COLUMNS = {
  'created-at': characters.createdAt,
  name: characters.name,
} as const satisfies Record<CharacterSort, unknown>;

function toCharacter(row: Row): Character {
  return new Character({
    document: decodeCharacterDocument(row.document),
    version: row.version,
    createdAt: Temporal.Instant.from(row.createdAt),
    updatedAt: Temporal.Instant.from(row.updatedAt),
  });
}

/** The row for `character`: its document at the current schema version, with the list columns copied from it. */
function toRow(character: Character): Row {
  const { document } = character;
  return {
    id: document.id,
    version: character.version,
    ownerId: document.ownerId,
    name: document.name,
    level: document.level,
    schemaVersion: document.schemaVersion,
    document,
    createdAt: character.createdAt.toString(),
    updatedAt: character.updatedAt.toString(),
  };
}

export class DrizzleCharacterRepository extends CharacterRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]> {
    const order = query.direction === SortDirection.Asc ? asc : desc;
    const rows = await this.#db
      .select()
      .from(characters)
      .where(eq(characters.ownerId, ownerId))
      .orderBy(order(SORT_COLUMNS[query.sort]), order(characters.id));
    return rows.map((row) => toCharacter(row));
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    const [row] = await this.#db.select().from(characters).where(eq(characters.id, id)).limit(1);
    return row === undefined ? undefined : toCharacter(row);
  }

  public override async insert(character: Character, audit: CharacterAudit): Promise<Character> {
    const [row] = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      return tx.insert(characters).values(toRow(character)).returning();
    });
    if (row === undefined) {
      throw new Error(`Insert of character ${character.id} returned no row`);
    }
    return toCharacter(row);
  }

  public override async update(
    character: Character,
    expectedVersion: Version,
    audit: CharacterAudit,
  ): Promise<Character> {
    const next = toRow(character.withVersion(nextVersion(expectedVersion)));
    const [row] = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      return tx
        .update(characters)
        .set(next)
        .where(and(eq(characters.id, character.id), eq(characters.version, expectedVersion)))
        .returning();
    });
    if (row === undefined) {
      throw new VersionConflictError('Character', character.id);
    }
    return toCharacter(row);
  }
}
