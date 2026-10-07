import { drizzle } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';

export type Database = ReturnType<typeof drizzle>;

export function connect(url: string): Database {
  return drizzle(url, { casing: 'snake_case' });
}

export async function runMigrations(db: Database): Promise<void> {
  await migrate(db, { migrationsFolder: `${import.meta.dir}/../migrations` });
}
