import { HomebrewEntryRepository } from '@pioneer/homebrew/application';
import type { EntryRef, EntryWrite, StoredHomebrewEntry } from '@pioneer/homebrew/application';
import { contentEntries, contentEntryRow, contentHash, contentPacks } from '@pioneer/rules/infrastructure';
import type { ContentEntry, ContentPackId } from '@pioneer/rules/sdk';
import { nextVersion, Temporal } from '@pioneer/shared/kernel';
import { stampAudit } from '@pioneer/shared/server';
import type { Executor } from '@pioneer/shared/server';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';

type EntryRow = typeof contentEntries.$inferSelect;

function toStored(row: EntryRow): StoredHomebrewEntry {
  const updatedAt = Temporal.Instant.from(row.updatedAt);

  return row.archivedAt === null
    ? { entry: row.data, updatedAt }
    : { entry: row.data, updatedAt, archivedAt: Temporal.Instant.from(row.archivedAt) };
}

/** Stamps the audit context and locks the pack's live row, which is the owner's alone to write to. */
async function lockPack(tx: Executor, pack: ContentPackId, { actor, command }: EntryWrite): Promise<boolean> {
  await stampAudit(tx, { actor, command });

  const [locked] = await tx
    .select({ id: contentPacks.id })
    .from(contentPacks)
    .where(and(eq(contentPacks.id, pack), eq(contentPacks.ownerId, actor), isNull(contentPacks.archivedAt)))
    .for('update');

  return locked !== undefined;
}

/** The pack's version, time and hash after a change to its live entries. */
async function moveOn(tx: Executor, pack: ContentPackId, { now }: EntryWrite): Promise<void> {
  const [row] = await tx.select().from(contentPacks).where(eq(contentPacks.id, pack));

  if (row === undefined) {
    return;
  }

  const live = await tx
    .select({ data: contentEntries.data })
    .from(contentEntries)
    .where(and(eq(contentEntries.packId, pack), isNull(contentEntries.archivedAt)));

  const hash = contentHash({ file: row.data, entries: live.map(({ data }) => data) });

  await tx
    .update(contentPacks)
    .set({ version: nextVersion(row.version), updatedAt: now.toString(), contentHash: hash })
    .where(eq(contentPacks.id, pack));
}

/**
 * Stores homebrew entries in `content_entries`. Each write locks the pack's row first, then moves the pack on, so two
 * writers to one pack take turns and its `content_hash` always names the live entries it holds.
 */
export class DrizzleHomebrewEntryRepository extends HomebrewEntryRepository {
  readonly #db: BunSQLDatabase;

  public constructor(db: BunSQLDatabase) {
    super();
    this.#db = db;
  }

  public override async list(pack: ContentPackId, archived: boolean): Promise<ReadonlyArray<StoredHomebrewEntry>> {
    const state = archived ? isNotNull(contentEntries.archivedAt) : isNull(contentEntries.archivedAt);

    const rows = await this.#db
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.packId, pack), state))
      .orderBy(asc(contentEntries.kind), asc(contentEntries.slug));

    return rows.map((row) => toStored(row));
  }

  public override async find({ pack, id }: EntryRef): Promise<StoredHomebrewEntry | undefined> {
    const [row] = await this.#db
      .select()
      .from(contentEntries)
      .where(and(eq(contentEntries.packId, pack), eq(contentEntries.id, id)));

    return row === undefined ? undefined : toStored(row);
  }

  public override async insert(pack: ContentPackId, entry: ContentEntry, write: EntryWrite): Promise<boolean> {
    return this.#db.transaction(async (tx): Promise<boolean> => {
      const locked = await lockPack(tx, pack, write);

      if (!locked) {
        return false;
      }

      // The unique slug index is the arbiter, so a race for one slug has one winner.
      const inserted = await tx
        .insert(contentEntries)
        .values(contentEntryRow(pack, entry, write.now.toString()))
        .onConflictDoNothing()
        .returning({ id: contentEntries.id });

      if (inserted.length === 0) {
        return false;
      }

      await moveOn(tx, pack, write);

      return true;
    });
  }

  public override async replace(pack: ContentPackId, entry: ContentEntry, write: EntryWrite): Promise<boolean> {
    return this.#db.transaction(async (tx): Promise<boolean> => {
      const locked = await lockPack(tx, pack, write);

      if (!locked) {
        return false;
      }

      const { id: _id, packId: _pack, ...fields } = contentEntryRow(pack, entry, write.now.toString());

      const updated = await tx
        .update(contentEntries)
        .set(fields)
        .where(and(eq(contentEntries.id, entry.id), eq(contentEntries.packId, pack), isNull(contentEntries.archivedAt)))
        .returning({ id: contentEntries.id });

      if (updated.length === 0) {
        return false;
      }

      await moveOn(tx, pack, write);

      return true;
    });
  }

  public override async setArchived({ pack, id }: EntryRef, archived: boolean, write: EntryWrite): Promise<boolean> {
    return this.#db.transaction(async (tx): Promise<boolean> => {
      const locked = await lockPack(tx, pack, write);

      if (!locked) {
        return false;
      }

      const here = and(eq(contentEntries.id, id), eq(contentEntries.packId, pack));
      const [existing] = await tx.select({ archivedAt: contentEntries.archivedAt }).from(contentEntries).where(here);

      if (existing === undefined) {
        return false;
      }

      if ((existing.archivedAt !== null) === archived) {
        return true;
      }

      await tx
        .update(contentEntries)
        .set({ archivedAt: archived ? write.now.toString() : sql`null` })
        .where(here);

      await moveOn(tx, pack, write);

      return true;
    });
  }
}
