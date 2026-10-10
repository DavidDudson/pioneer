import type { AuditContext } from '@pioneer/shared/kernel';
import { sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/** Anything that runs SQL: a database or a transaction. */
interface SqlExecutor {
  execute: (query: SQL) => PromiseLike<unknown>;
}

/**
 * Names the actor and command on every `audit.log` row the surrounding transaction writes, read by
 * `audit.capture()`. Call first inside `db.transaction`: the settings are `set local`, so they end with
 * the transaction and never leak to the next one on the pooled connection.
 */
export async function stampAudit(tx: SqlExecutor, { actor, command }: AuditContext<string>): Promise<void> {
  await tx.execute(
    sql`select set_config('pioneer.actor_id', ${actor}, true), set_config('pioneer.command', ${command}, true)`,
  );
}
