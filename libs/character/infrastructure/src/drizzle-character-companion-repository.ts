import { CharacterCompanionRepository, isKindFull, kindFullError } from '@pioneer/character/application';
import type { CompanionArchival, CompanionWriteContext } from '@pioneer/character/application';
import { AnimalCompanionForm, FamiliarForm } from '@pioneer/character/domain';
import type { CharacterId, Companion, CompanionId } from '@pioneer/character/domain';
import { CompanionKind } from '@pioneer/rules/sdk';
import { nextVersion, Temporal, VersionConflictError } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import { and, count, desc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

import { characterCompanions } from './character-companion.table';
import { characters } from './character.table';

/** Name the commands on the audit rows they write, as a service use case names a command. */
const ADD_COMMAND = 'add-companion';
const ARCHIVE_COMMAND = 'archive-companion';
const RESTORE_COMMAND = 'restore-companion';

type CharacterCompanionRow = typeof characterCompanions.$inferSelect;

// oxlint-disable-next-line quality/no-unsafe-dictionary-type -- the schema-less handle every Drizzle repository here takes
type Database = BunSQLDatabase<Record<string, unknown>>;

/** What `bumpVersion` needs of a transaction. */
type VersionWriter = Pick<Database, 'update'>;

/** What `liveCount` needs of a transaction. */
type LiveReader = Pick<Database, 'select'>;

/** Drizzle skips `undefined`, and the lint rules refuse `null`, so a column is cleared with SQL's own. */
const SQL_NULL = sql`null`;

function toCompanion(row: CharacterCompanionRow): Companion {
  const archivedAt = row.archivedAt ?? undefined;
  const reason = row.archiveReason ?? undefined;

  const archived =
    archivedAt === undefined || reason === undefined ? undefined : { at: Temporal.Instant.from(archivedAt), reason };

  const base = {
    id: row.id,
    name: row.name,
    grantedBy: row.grantedBy,
    createdAt: Temporal.Instant.from(row.createdAt),
    archived,
  };

  if (row.kind === CompanionKind.Familiar) {
    return { ...base, kind: row.kind, form: FamiliarForm.parse(row.form) };
  }

  return { ...base, kind: row.kind, form: AnimalCompanionForm.parse(row.form) };
}

export class DrizzleCharacterCompanionRepository extends CharacterCompanionRepository {
  readonly #db: Database;

  public constructor(db: Database) {
    super();
    this.#db = db;
  }

  public override async listForCharacter(characterId: CharacterId): Promise<ReadonlyArray<Companion>> {
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

      const live = await liveCount(tx, context.characterId, companion.kind);

      if (isKindFull(companion.kind, live)) {
        throw kindFullError(context.characterId, companion.kind, 'add');
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

      const live = await liveCount(tx, context.characterId, target.kind);

      if (isKindFull(target.kind, live)) {
        throw kindFullError(context.characterId, target.kind, 'restore');
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

/** How many live companions of the kind the character holds. */
async function liveCount(tx: LiveReader, characterId: CharacterId, kind: Companion['kind']): Promise<number> {
  const [live] = await tx
    .select({ total: count() })
    .from(characterCompanions)
    .where(
      and(
        eq(characterCompanions.characterId, characterId),
        eq(characterCompanions.kind, kind),
        isNull(characterCompanions.archivedAt),
      ),
    );

  return live?.total ?? 0;
}
