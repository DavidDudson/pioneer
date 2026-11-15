import { CharacterCompanionMessage, CharacterCompanionRepository } from '@pioneer/character/application';
import type { CompanionArchival, CompanionWriteContext } from '@pioneer/character/application';
import type { CharacterId, Companion, CompanionId } from '@pioneer/character/domain';
import { ConflictError, message, nextVersion, Temporal, VersionConflictError } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterCompanions } from './character-companion.table';
import { characters } from './character.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ADD_COMMAND = 'add-companion';
const ARCHIVE_COMMAND = 'archive-companion';
const RESTORE_COMMAND = 'restore-companion';

type CharacterCompanionRow = typeof characterCompanions.$inferSelect;

// oxlint-disable-next-line anti-slop/no-unsafe-dictionary-type -- the schema-less handle every Drizzle repository here takes
type Database = BunSQLDatabase<Record<string, unknown>>;

/** What `bumpVersion` needs of a transaction. */
type VersionWriter = Pick<Database, 'update'>;

/** What `hasLiveCompanion` needs of a transaction. */
type LiveReader = Pick<Database, 'select'>;

/** Drizzle skips `undefined`, and the lint rules refuse `null`, so a column is cleared with SQL's own. */
const SQL_NULL = sql`null`;

function toCompanion(row: CharacterCompanionRow): Companion {
  const archivedAt = row.archivedAt ?? undefined;
  const reason = row.archiveReason ?? undefined;

  const archived =
    archivedAt === undefined || reason === undefined ? undefined : { at: Temporal.Instant.from(archivedAt), reason };

  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    form: row.form,
    grantedBy: row.grantedBy,
    createdAt: Temporal.Instant.from(row.createdAt),
    archived,
  };
}

export class DrizzleCharacterCompanionRepository extends CharacterCompanionRepository {
  readonly #db: Database;

  public constructor(db: Database) {
    super();
    this.#db = db;
  }

  public override async listForCharacter(characterId: CharacterId): Promise<readonly Companion[]> {
    const rows = await this.#db
      .select()
      .from(characterCompanions)
      .where(eq(characterCompanions.characterId, characterId))
      .orderBy(
        sql`${characterCompanions.archivedAt} is not null`,
        desc(characterCompanions.createdAt),
        desc(characterCompanions.id),
      );

    return rows.map((row) => toCompanion(row));
  }

  public override async add(context: CompanionWriteContext, companion: Companion): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor: context.actor, command: ADD_COMMAND });
      await bumpVersion(tx, context);

      const taken = await hasLiveCompanion(tx, context.characterId, companion.kind);

      if (taken) {
        throw new ConflictError(
          `Character ${context.characterId} already has a live ${companion.kind}`,
          message(CharacterCompanionMessage.KindTaken, { kind: companion.kind }),
        );
      }

      await tx.insert(characterCompanions).values({
        id: companion.id,
        characterId: context.characterId,
        kind: companion.kind,
        name: companion.name,
        form: companion.form,
        grantedBy: companion.grantedBy,
        createdAt: companion.createdAt.toString(),
      });
    });
  }

  public override async archive(context: CompanionWriteContext, { id, reason }: CompanionArchival): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor: context.actor, command: ARCHIVE_COMMAND });
      await bumpVersion(tx, context);
      await tx
        .update(characterCompanions)
        .set({ archivedAt: context.at.toString(), archiveReason: reason })
        .where(
          and(
            eq(characterCompanions.id, id),
            eq(characterCompanions.characterId, context.characterId),
            isNull(characterCompanions.archivedAt),
          ),
        );
    });
  }

  public override async restore(context: CompanionWriteContext, id: CompanionId): Promise<void> {
    await this.#db.transaction(async (tx) => {
      await stampAudit(tx, { actor: context.actor, command: RESTORE_COMMAND });
      await bumpVersion(tx, context);

      const [target] = await tx
        .select()
        .from(characterCompanions)
        .where(
          and(
            eq(characterCompanions.id, id),
            eq(characterCompanions.characterId, context.characterId),
            isNotNull(characterCompanions.archivedAt),
          ),
        )
        .limit(1);

      if (target === undefined) {
        return;
      }

      const taken = await hasLiveCompanion(tx, context.characterId, target.kind);

      if (taken) {
        throw new ConflictError(
          `Character ${context.characterId} already has a live ${target.kind}`,
          message(CharacterCompanionMessage.RestoreBlocked, { kind: target.kind }),
        );
      }

      await tx
        .update(characterCompanions)
        .set({ archivedAt: SQL_NULL, archiveReason: SQL_NULL })
        .where(
          and(
            eq(characterCompanions.id, id),
            eq(characterCompanions.characterId, context.characterId),
            isNotNull(characterCompanions.archivedAt),
          ),
        );
    });
  }
}

/** The character's version moves with every companion write, so one lock guards the build. */
async function bumpVersion(
  tx: VersionWriter,
  { characterId, expectedVersion, at }: CompanionWriteContext,
): Promise<void> {
  const bumped = await tx
    .update(characters)
    .set({ version: nextVersion(expectedVersion), updatedAt: at.toString() })
    .where(and(eq(characters.id, characterId), eq(characters.version, expectedVersion)))
    .returning({ id: characters.id });

  if (bumped.length === 0) {
    throw new VersionConflictError('Character', characterId);
  }
}

/** Whether the character holds a live companion of the kind, the place the unique index guards. */
async function hasLiveCompanion(tx: LiveReader, characterId: CharacterId, kind: Companion['kind']): Promise<boolean> {
  const [live] = await tx
    .select({ id: characterCompanions.id })
    .from(characterCompanions)
    .where(
      and(
        eq(characterCompanions.characterId, characterId),
        eq(characterCompanions.kind, kind),
        isNull(characterCompanions.archivedAt),
      ),
    )
    .limit(1);

  return live !== undefined;
}
