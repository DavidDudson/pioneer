import type { Temporal } from '@pioneer/shared/kernel';
import { and, isNotNull, isNull, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import type { BunSQLQueryResultHKT } from 'drizzle-orm/bun-sql';
import type { PgColumn, PgDatabase, PgTable } from 'drizzle-orm/pg-core';

/** A database or a transaction. */
export type Executor = PgDatabase<BunSQLQueryResultHKT>;

/** A table whose rows are archived, never deleted (ADR-0062): it has an `archivedAt` column. */
export type ArchivableTable = PgTable & { readonly archivedAt: PgColumn };

/** Steps a repository may add around the update, for rows other writes contend for. */
export interface ArchiveGuard {
  /** Runs first, before the row is locked: take any wider lock here so lock order stays the same everywhere. */
  readonly beforeLock?: (tx: Executor) => Promise<void>;
  /** Runs once the row is locked, before the update, and sees every change that committed. */
  readonly whileLocked?: (() => Promise<void>) | undefined;
}

/** What an archive or restore writes: the rows to touch, with the steps to run around the update. */
interface ArchiveChange {
  /** Names the rows; the live or archived guard is added by the helper. */
  readonly where: SQL | undefined;
  readonly guard?: ArchiveGuard | undefined;
}

interface ArchiveWrite extends ArchiveChange {
  readonly archivedAt: SQL | string;
}

async function setArchived(tx: Executor, table: ArchivableTable, write: ArchiveWrite): Promise<void> {
  const { where, archivedAt, guard } = write;

  if (guard === undefined) {
    await tx.update(table).set({ archivedAt }).where(where);

    return;
  }

  await guard.beforeLock?.(tx);
  const [locked] = await tx.select().from(table).where(where).for('update').limit(1);

  if (locked === undefined) {
    return;
  }

  await guard.whileLocked?.();
  await tx.update(table).set({ archivedAt }).where(where);
}

/** An archive: `now` is the instant stamped on the rows. */
export interface ArchiveRows extends ArchiveChange {
  readonly now: Temporal.Instant;
}

/**
 * Stamps `archivedAt` on the live rows `where` matches. Version and `updatedAt` stay: nothing about the content changed.
 * Call inside a transaction that has stamped the audit context.
 */
export async function archiveRows(tx: Executor, table: ArchivableTable, change: ArchiveRows): Promise<void> {
  await setArchived(tx, table, {
    where: and(change.where, isNull(table.archivedAt)),
    archivedAt: change.now.toString(),
    guard: change.guard,
  });
}

/** Clears `archivedAt` on the archived rows `where` matches. Same transaction rules as `archiveRows`. */
export async function restoreRows(tx: Executor, table: ArchivableTable, change: ArchiveChange): Promise<void> {
  await setArchived(tx, table, {
    where: and(change.where, isNotNull(table.archivedAt)),
    archivedAt: sql`null`,
    guard: change.guard,
  });
}
