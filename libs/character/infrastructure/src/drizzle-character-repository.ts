import { CharacterRepository } from '@pioneer/character/application';
import { Character, CharacterId } from '@pioneer/character/domain';
import { AncestryId, AttributeModifiers } from '@pioneer/rules/sdk';
import { Temporal, VersionConflictError } from '@pioneer/shared/kernel';
import type { Version } from '@pioneer/shared/kernel';
import { and, asc, eq } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characters } from './character.table';

type Row = typeof characters.$inferSelect;

function toCharacter(row: Row): Character {
  return new Character({
    id: CharacterId.parse(row.id),
    version: row.version,
    name: row.name,
    ancestry: AncestryId.parse(row.ancestry),
    level: row.level,
    attributes: AttributeModifiers.codec.parse(row.attributes),
    createdAt: Temporal.Instant.from(row.createdAt),
    updatedAt: Temporal.Instant.from(row.updatedAt),
  });
}

function toRow(character: Character): Row {
  return {
    id: character.id,
    version: character.version,
    name: character.name,
    ancestry: character.ancestry,
    level: character.level,
    attributes: character.attributes.toWire(),
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

  public override async list(): Promise<readonly Character[]> {
    const rows = await this.#db.select().from(characters).orderBy(asc(characters.createdAt));
    return rows.map((row) => toCharacter(row));
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    const [row] = await this.#db.select().from(characters).where(eq(characters.id, id)).limit(1);
    return row === undefined ? undefined : toCharacter(row);
  }

  public override async insert(character: Character): Promise<Character> {
    const [row] = await this.#db.insert(characters).values(toRow(character)).returning();
    if (row === undefined) {
      throw new Error(`Insert of character ${character.id} returned no row`);
    }
    return toCharacter(row);
  }

  public override async update(character: Character, expectedVersion: Version): Promise<Character> {
    const next = toRow(character.withVersion(expectedVersion + 1));
    const [row] = await this.#db
      .update(characters)
      .set(next)
      .where(and(eq(characters.id, character.id), eq(characters.version, expectedVersion)))
      .returning();
    if (row === undefined) {
      throw new VersionConflictError('Character', character.id);
    }
    return toCharacter(row);
  }
}
