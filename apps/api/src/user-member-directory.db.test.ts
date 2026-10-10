import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { MemberName } from '@pioneer/campaign/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { UserMemberDirectory } from './user-member-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const at = fixedClock('2026-10-10T10:00:00Z').now().toString();

describe.skipIf(adminUrl === undefined)('UserMemberDirectory (postgres)', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${amiri}, 'Amiri', false, ${at}, ${at}), (${ezren}, 'Ezren', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('names the users that exist and leaves out the rest', async () => {
    const directory = new UserMemberDirectory(database.db);
    const names = await directory.displayNames([amiri, ezren, UserId.parse(newId())]);
    expect(names).toStrictEqual(
      new Map([
        [amiri, MemberName.parse('Amiri')],
        [ezren, MemberName.parse('Ezren')],
      ]),
    );
    expect(await directory.displayNames([])).toStrictEqual(new Map());
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
