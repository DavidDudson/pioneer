import { VersionConflictError } from '@pioneer/shared/kernel';
import type { SQL } from 'drizzle-orm';
import type { PgTable } from 'drizzle-orm/pg-core';

import type { Executor } from './archivable';

/** The write: the columns to set, the row it belongs to and the condition that carries the expected version. */
export interface VersionedChange<TTable extends PgTable> {
  // The bare `PgTable` constraint has an empty insert shape; each call site's table narrows it.
  // oxlint-disable-next-line typescript/no-generated-empty-object-type
  readonly set: Partial<TTable['$inferInsert']>;
  /** Names the row and the version it must still have, so a stale write matches nothing. */
  readonly where: SQL | undefined;
  /** The kind of row, named in the conflict it raises. */
  readonly resource: string;
  readonly id: string;
}

/**
 * Optimistic concurrency: updates the row `change.where` matches and returns it, or throws `VersionConflictError`
 * when none matched because someone else changed it since it was read. Inside a transaction the throw rolls it back.
 */
export async function updateVersioned<TTable extends PgTable>(
  tx: Executor,
  table: TTable,
  change: VersionedChange<TTable>,
): Promise<TTable['$inferSelect']> {
  const [row] = await tx.update(table).set(change.set).where(change.where).returning();

  if (row === undefined) {
    throw new VersionConflictError(change.resource, change.id);
  }

  return row;
}
