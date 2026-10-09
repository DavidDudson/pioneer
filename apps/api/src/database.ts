import { drizzle } from 'drizzle-orm/bun-sql';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';

export type Database = BunSQLDatabase & { readonly $client: Bun.SQL };

export function connect(url: string): Database {
  return drizzle(url, { casing: 'snake_case' });
}

/** Apply every pending migration in `folder` (MIGRATIONS_DIR). A folder without a journal fails before connecting. */
export async function runMigrations(db: Database, folder: string): Promise<void> {
  const journal = Bun.file(`${folder}/meta/_journal.json`);
  const journalExists = await journal.exists();
  if (!journalExists) {
    throw new Error(`No migrations in MIGRATIONS_DIR=${folder}: meta/_journal.json is missing`);
  }
  await migrate(db, { migrationsFolder: folder });
}
