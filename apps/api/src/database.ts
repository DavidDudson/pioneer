import { drizzle } from 'drizzle-orm/bun-sql';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';

export type Database = BunSQLDatabase<Record<string, unknown>> & { readonly $client: Bun.SQL };

/** Session advisory lock key held while migrating. Any fixed value works; every instance must use the same one. */
const MIGRATION_LOCK = 109_001;

export function connect(url: string): Database {
  return drizzle(url, { casing: 'snake_case' });
}

/**
 * Apply every pending migration in `folder` (MIGRATIONS_DIR). A folder without a journal fails before connecting.
 * Drizzle's migrator takes no lock, so instances starting together serialise on an advisory lock held on one
 * reserved connection; the later ones find nothing pending.
 */
export async function runMigrations(db: Database, folder: string): Promise<void> {
  const journal = Bun.file(`${folder}/meta/_journal.json`);
  const journalExists = await journal.exists();
  if (!journalExists) {
    throw new Error(`No migrations in MIGRATIONS_DIR=${folder}: meta/_journal.json is missing`);
  }
  const connection = await db.$client.reserve();
  try {
    await connection`select pg_advisory_lock(${MIGRATION_LOCK})`;
    await migrate(drizzle({ client: connection, casing: 'snake_case' }), { migrationsFolder: folder });
  } finally {
    await connection`select pg_advisory_unlock(${MIGRATION_LOCK})`;
    connection.release();
  }
}
