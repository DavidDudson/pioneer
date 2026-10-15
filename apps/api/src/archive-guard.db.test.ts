import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

/** What Postgres said: drizzle wraps it, so the reason is on the cause. */
function reason(error: unknown): string {
  const cause = error instanceof Error ? error.cause : undefined;
  return cause instanceof Error ? cause.message : String(error);
}

/** `archive.protect` (ADR-0062). Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();

describe.skipIf(adminUrl === undefined)('archive guard (postgres)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await database.db.execute(sql`CREATE TABLE guarded_things (id integer PRIMARY KEY, archived_at timestamptz)`);
    await database.db.execute(sql`CREATE TABLE loose_things (id integer PRIMARY KEY)`);
    await database.db.execute(sql`SELECT archive.protect('guarded_things')`);
    await database.db.execute(sql`INSERT INTO guarded_things (id) VALUES (1)`);
    await database.db.execute(sql`INSERT INTO loose_things (id) VALUES (1)`);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a protected row cannot be deleted', async () => {
    const error = await rejection(database.db.execute(sql`DELETE FROM guarded_things WHERE id = 1`));
    expect(reason(error)).toContain('archived, never deleted');
  });

  test('a protected table cannot be truncated', async () => {
    const error = await rejection(database.db.execute(sql`TRUNCATE guarded_things`));
    expect(reason(error)).toContain('archived, never deleted');
  });

  test('a protected row can still be archived', async () => {
    await database.db.execute(sql`UPDATE guarded_things SET archived_at = now() WHERE id = 1`);
    const rows = await database.db.execute(sql`SELECT id FROM guarded_things WHERE archived_at IS NOT NULL`);
    expect(rows).toHaveLength(1);
  });

  test('an unprotected table is untouched', async () => {
    await database.db.execute(sql`DELETE FROM loose_things WHERE id = 1`);
    const rows = await database.db.execute(sql`SELECT id FROM loose_things`);
    expect(rows).toHaveLength(0);
  });
});
