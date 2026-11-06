import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { connect } from './database';
import type { Database } from './database';

const adminUrl = testDatabaseUrl();

describe.skipIf(adminUrl === undefined)('connect (postgres)', () => {
  let database: TestDatabase;
  let db: Database;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const [{ name } = { name: '' }] = await database.db.execute<{ name: string }>(
      sql`select current_database() as name`,
    );
    await database.db.execute(sql.raw(`alter database ${name} set timezone to 'Pacific/Auckland'`));
    const url = new URL(adminUrl ?? '');
    url.pathname = `/${name}`;
    db = connect(url.toString());
  });

  afterAll(async () => {
    await db.$client.close();
    await database.drop();
  });

  test('reads a timestamptz in UTC even when the database is set to another zone', async () => {
    const [row] = await db.execute<{ zone: string; at: string }>(
      sql`select current_setting('TimeZone') as zone, '2026-01-01T00:00:00Z'::timestamptz::text as at`,
    );
    expect(row).toStrictEqual({ zone: 'UTC', at: '2026-01-01 00:00:00+00' });
  });
});
