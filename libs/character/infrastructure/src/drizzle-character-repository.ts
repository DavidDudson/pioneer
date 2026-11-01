import { CharacterRepository } from '@pioneer/character/application';
import type { CharacterAudit, PlayWrite } from '@pioneer/character/application';
import { Character, decodeCharacterDocument, PlayStateId, PlayStateSchema } from '@pioneer/character/domain';
import type {
  CharacterId,
  CharacterListQuery,
  CharacterPlay,
  CharacterSort,
  PlayState,
} from '@pioneer/character/domain';
import {
  FIRST_VERSION,
  newId,
  nextVersion,
  SortDirection,
  Temporal,
  VersionConflictError,
} from '@pioneer/shared/kernel';
import type { UserId, Version } from '@pioneer/shared/kernel';
import { RequestMemo, stampAudit } from '@pioneer/shared/server';
import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterPlay, characters } from './character.table';

type Row = typeof characters.$inferSelect;
/** What a build save writes: never `archivedAt`, which only archive and restore touch. */
type SavedRow = Omit<Row, 'archivedAt'>;
type PlayRow = typeof characterPlay.$inferSelect;

/** A character row with its play state, as every read joins them. */
interface JoinedRow {
  readonly character: Row;
  readonly play: unknown;
}

/**
 * Exhaustive: adding a CharacterSort option without a column (and an index,
 * see character.table.ts) does not compile / fails the plan guard.
 */
const SORT_COLUMNS = {
  'created-at': characters.createdAt,
  name: characters.name,
} as const satisfies Record<CharacterSort, unknown>;

/** Stored play state, read at the current shape: a field added since it was written takes its default. */
function decodePlay(stored: unknown): PlayState {
  // A missing row (a left join's null) reads as fresh play state.
  const play = PlayStateSchema.safeParse(stored ?? {});
  if (!play.success) {
    throw new Error('Stored play state is invalid', { cause: play.error });
  }
  return play.data;
}

/** A character with its play state read into `document.play`; a row with none yet reads as fresh. */
function toCharacter({ character: row, play }: JoinedRow): Character {
  const document = decodeCharacterDocument(row.document);
  return new Character({
    document: { ...document, play: decodePlay(play) },
    version: row.version,
    createdAt: Temporal.Instant.from(row.createdAt),
    updatedAt: Temporal.Instant.from(row.updatedAt),
  });
}

/**
 * The row for `character`: its document at the current schema version without its play state, which is stored apart
 * (`character_play`), with the list columns copied from it.
 */
function toRow(character: Character): SavedRow {
  const { play: _apart, ...document } = character.document;
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

function toPlay(row: Pick<PlayRow, 'playRevision' | 'state'>): CharacterPlay {
  return { revision: row.playRevision, play: decodePlay(row.state) };
}

export class DrizzleCharacterRepository extends CharacterRepository {
  readonly #db: BunSQLDatabase<Record<string, unknown>>;
  readonly #found = new RequestMemo<CharacterId, Character | undefined>();

  public constructor(db: BunSQLDatabase<Record<string, unknown>>) {
    super();
    this.#db = db;
  }

  public override async listForOwner(ownerId: UserId, query: CharacterListQuery): Promise<readonly Character[]> {
    return this.#listFor(and(eq(characters.ownerId, ownerId), isNull(characters.archivedAt)), query);
  }

  public override async listArchivedForOwner(
    ownerId: UserId,
    query: CharacterListQuery,
  ): Promise<readonly Character[]> {
    return this.#listFor(and(eq(characters.ownerId, ownerId), isNotNull(characters.archivedAt)), query);
  }

  async #listFor(where: SQL | undefined, query: CharacterListQuery): Promise<readonly Character[]> {
    const order = query.direction === SortDirection.Asc ? asc : desc;
    const rows = await this.#db
      .select({ character: characters, play: characterPlay.state })
      .from(characters)
      .leftJoin(characterPlay, eq(characterPlay.characterId, characters.id))
      .where(where)
      .orderBy(order(SORT_COLUMNS[query.sort]), order(characters.id));
    return rows.map((row) => toCharacter(row));
  }

  public override async findById(id: CharacterId): Promise<Character | undefined> {
    return this.#found.of(id, async () => this.#findOne(and(eq(characters.id, id), isNull(characters.archivedAt))));
  }

  public override async findByIds(ids: readonly CharacterId[]): Promise<readonly Character[]> {
    if (ids.length === 0) {
      return [];
    }
    const rows = await this.#db
      .select({ character: characters, play: characterPlay.state })
      .from(characters)
      .leftJoin(characterPlay, eq(characterPlay.characterId, characters.id))
      .where(and(inArray(characters.id, [...ids]), isNull(characters.archivedAt)));
    return rows.map((row) => toCharacter(row));
  }

  public override async findArchivedById(id: CharacterId): Promise<Character | undefined> {
    return this.#findOne(and(eq(characters.id, id), isNotNull(characters.archivedAt)));
  }

  async #findOne(where: SQL | undefined): Promise<Character | undefined> {
    const [row] = await this.#db
      .select({ character: characters, play: characterPlay.state })
      .from(characters)
      .leftJoin(characterPlay, eq(characterPlay.characterId, characters.id))
      .where(where)
      .limit(1);
    return row === undefined ? undefined : toCharacter(row);
  }

  public override async archive(id: CharacterId, now: Temporal.Instant, audit: CharacterAudit): Promise<void> {
    await this.#setArchived(and(eq(characters.id, id), isNull(characters.archivedAt)), now.toString(), audit);
  }

  public override async restore(id: CharacterId, audit: CharacterAudit): Promise<void> {
    await this.#setArchived(and(eq(characters.id, id), isNotNull(characters.archivedAt)), sql`null`, audit);
  }

  /** Stamps or clears `archivedAt` on the rows `where` matches, with the audit context. Version and `updatedAt` stay: nothing about the build changed. */
  async #setArchived(where: SQL | undefined, archivedAt: SQL | string, audit: CharacterAudit): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      await tx.update(characters).set({ archivedAt }).where(where);
    });
  }

  public override async insert(character: Character, audit: CharacterAudit): Promise<Character> {
    const stamp = character.createdAt.toString();
    const [row] = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      const inserted = await tx.insert(characters).values(toRow(character)).returning();
      await tx.insert(characterPlay).values({
        id: PlayStateId.parse(newId()),
        characterId: character.id,
        playRevision: FIRST_VERSION,
        state: character.document.play,
        createdAt: stamp,
        updatedAt: stamp,
      });
      return inserted;
    });
    if (row === undefined) {
      throw new Error(`Insert of character ${character.id} returned no row`);
    }
    return toCharacter({ character: row, play: character.document.play });
  }

  public override async update(
    character: Character,
    expectedVersion: Version,
    audit: CharacterAudit,
  ): Promise<Character> {
    const next = toRow(character.withVersion(nextVersion(expectedVersion)));
    const saved = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      const [row] = await tx
        .update(characters)
        .set(next)
        .where(and(eq(characters.id, character.id), eq(characters.version, expectedVersion)))
        .returning();
      const [play] = await tx
        .select({ state: characterPlay.state })
        .from(characterPlay)
        .where(eq(characterPlay.characterId, character.id))
        .limit(1);
      return row === undefined ? undefined : { character: row, play: play?.state };
    });
    if (saved === undefined) {
      throw new VersionConflictError('Character', character.id);
    }
    return toCharacter(saved);
  }

  public override async findPlay(id: CharacterId): Promise<CharacterPlay | undefined> {
    const [row] = await this.#db
      .select({ playRevision: characterPlay.playRevision, state: characterPlay.state })
      .from(characterPlay)
      .where(eq(characterPlay.characterId, id))
      .limit(1);
    return row === undefined ? undefined : toPlay(row);
  }

  public override async updatePlay({ id, play, expectedRevision, audit, now }: PlayWrite): Promise<CharacterPlay> {
    const [row] = await this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      return tx
        .update(characterPlay)
        .set({ state: play, playRevision: nextVersion(expectedRevision), updatedAt: now.toString() })
        .where(and(eq(characterPlay.characterId, id), eq(characterPlay.playRevision, expectedRevision)))
        .returning({ playRevision: characterPlay.playRevision, state: characterPlay.state });
    });
    if (row === undefined) {
      throw new VersionConflictError('CharacterPlay', id);
    }
    return toPlay(row);
  }

  public override async updatePlayAndCharacter(
    { id, play, expectedRevision, audit, now }: PlayWrite,
    character: Character,
    expectedVersion: Version,
  ): Promise<CharacterPlay> {
    const next = toRow(character.withVersion(nextVersion(expectedVersion)));
    return this.#db.transaction(async (tx) => {
      await stampAudit(tx, audit);
      const [built] = await tx
        .update(characters)
        .set(next)
        .where(and(eq(characters.id, id), eq(characters.version, expectedVersion)))
        .returning({ id: characters.id });
      if (built === undefined) {
        throw new VersionConflictError('Character', id);
      }
      const [row] = await tx
        .update(characterPlay)
        .set({ state: play, playRevision: nextVersion(expectedRevision), updatedAt: now.toString() })
        .where(and(eq(characterPlay.characterId, id), eq(characterPlay.playRevision, expectedRevision)))
        .returning({ playRevision: characterPlay.playRevision, state: characterPlay.state });
      if (row === undefined) {
        throw new VersionConflictError('CharacterPlay', id);
      }
      return toPlay(row);
    });
  }
}
