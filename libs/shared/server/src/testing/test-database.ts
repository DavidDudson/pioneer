import { drizzle } from 'drizzle-orm/bun-sql';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import type { Logger } from 'drizzle-orm/logger';

/** Repo-relative migrations folder, resolved from this file. */
const MIGRATIONS = new URL('../../../../../apps/api/migrations', import.meta.url).pathname;

export interface TestDatabase {
  readonly db: BunSQLDatabase<Record<string, unknown>> & { readonly $client: Bun.SQL };
  readonly drop: () => Promise<void>;
}

/**
 * A fresh, fully migrated database for one test file: `pioneer_test_<random>`
 * on the server behind TEST_DATABASE_URL (which is only used as the admin
 * connection). Files never share state, so Nx can run them in parallel.
 * Always `await drop()` in `afterAll`.
 */
export async function createTestDatabase(adminUrl: string, logger?: Logger): Promise<TestDatabase> {
  const name = `pioneer_test_${crypto.randomUUID().replaceAll('-', '')}`;
  const admin = new Bun.SQL(adminUrl);
  await admin.unsafe(`create database ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  const setup = drizzle(url.toString(), { casing: 'snake_case' });
  await migrate(setup, { migrationsFolder: MIGRATIONS });
  await setup.$client.close();
  const db = drizzle(url.toString(), { casing: 'snake_case', ...(logger === undefined ? {} : { logger }) });
  return {
    db,
    drop: async (): Promise<void> => {
      await db.$client.close();
      await admin.unsafe(`drop database if exists ${name} with (force)`);
      await admin.close();
    },
  };
}
