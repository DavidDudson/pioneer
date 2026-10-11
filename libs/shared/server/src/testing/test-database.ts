import { $ } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import type { BunSQLDatabase } from 'drizzle-orm/bun-sql';
import { migrate } from 'drizzle-orm/bun-sql/migrator';
import type { Logger } from 'drizzle-orm/logger';
import * as z from 'zod';

/** Repo-relative migrations folder, resolved from this file. */
const MIGRATIONS = new URL('../../../../../apps/api/migrations', import.meta.url).pathname;

const JournalEntry = z.looseObject({ tag: z.string() });
const Journal = z.looseObject({ entries: z.array(JournalEntry) });

export interface TestDatabase {
  readonly db: BunSQLDatabase<Record<string, unknown>> & { readonly $client: Bun.SQL };
  readonly drop: () => Promise<void>;
}

/** A test database migrated up to a given migration, for testing what that migration does to existing rows. */
export interface PartlyMigratedDatabase extends TestDatabase {
  /** Applies every migration not applied yet, the one the database stopped before included. */
  readonly migrateRest: () => Promise<void>;
}

/**
 * The admin URL for database suites, or `undefined` to skip them locally.
 * In CI a missing URL throws instead, so the suites can never skip silently.
 */
export function testDatabaseUrl(): string | undefined {
  const url = Bun.env['TEST_DATABASE_URL'];
  if (url === undefined && Bun.env['CI'] !== undefined) {
    throw new Error('TEST_DATABASE_URL must be set in CI; database suites would otherwise skip');
  }
  return url;
}

async function migrateFrom(url: string, folder: string): Promise<void> {
  const setup = drizzle(url, { casing: 'snake_case' });
  await migrate(setup, { migrationsFolder: folder });
  await setup.$client.close();
}

/** A copy of the migrations folder whose journal ends just before the migration tagged `tag`. */
async function migrationsBefore(tag: string): Promise<string> {
  const folder = `${Bun.env['TMPDIR'] ?? '/tmp'}/pioneer-migrations-${crypto.randomUUID()}`;
  await $`cp -R ${MIGRATIONS} ${folder}`;
  const journalFile = Bun.file(`${folder}/meta/_journal.json`);
  const journal = Journal.parse(await journalFile.json());
  const stop = journal.entries.findIndex((entry) => entry.tag === tag);
  if (stop === -1) {
    throw new Error(`No migration tagged ${tag}`);
  }
  await Bun.write(journalFile, JSON.stringify({ ...journal, entries: journal.entries.slice(0, stop) }));
  return folder;
}

interface Created {
  readonly database: TestDatabase;
  readonly url: string;
}

async function emptyTestDatabase(adminUrl: string, logger: Logger | undefined, folder: string): Promise<Created> {
  const name = `pioneer_test_${crypto.randomUUID().replaceAll('-', '')}`;
  const admin = new Bun.SQL(adminUrl);
  await admin.unsafe(`create database ${name}`);
  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await migrateFrom(url.toString(), folder);
  const db = drizzle(url.toString(), { casing: 'snake_case', ...(logger === undefined ? {} : { logger }) });
  const database: TestDatabase = {
    db,
    drop: async (): Promise<void> => {
      await db.$client.close();
      await admin.unsafe(`drop database if exists ${name} with (force)`);
      await admin.close();
    },
  };
  return { database, url: url.toString() };
}

/**
 * A fresh, fully migrated database for one test file: `pioneer_test_<random>`
 * on the server behind TEST_DATABASE_URL (which is only used as the admin
 * connection). Files never share state, so Nx can run them in parallel.
 * Always `await drop()` in `afterAll`.
 */
export async function createTestDatabase(adminUrl: string, logger?: Logger): Promise<TestDatabase> {
  const { database } = await emptyTestDatabase(adminUrl, logger, MIGRATIONS);
  return database;
}

/**
 * Like `createTestDatabase`, but migrated only up to the migration tagged `tag` (the journal's name for it, such
 * as `0012_character_document`). Write rows in the old shape, then `migrateRest()`.
 */
export async function createTestDatabaseBefore(adminUrl: string, tag: string): Promise<PartlyMigratedDatabase> {
  const folder = await migrationsBefore(tag);
  try {
    const { database, url } = await emptyTestDatabase(adminUrl, undefined, folder);
    return {
      ...database,
      migrateRest: async (): Promise<void> => migrateFrom(url, MIGRATIONS),
    };
  } finally {
    await $`rm -rf ${folder}`;
  }
}
