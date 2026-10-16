import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { fixtureOwnerId } from '@pioneer/character/domain/testing';
import { UserRole } from '@pioneer/identity/domain';
import { users } from '@pioneer/identity/infrastructure';
import { newId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { grantMaintainer } from './grant-maintainer';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();

describe.skipIf(adminUrl === undefined)('grantMaintainer (postgres)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = '2026-10-16T10:00:00Z';
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  async function roleOf(id: string): Promise<string | undefined> {
    const [row] = await database.db
      .select({ role: users.role })
      .from(users)
      .where(sql`${users.id} = ${id}`);
    return row?.role;
  }

  test('accounts start as members', async () => {
    expect(await roleOf(fixtureOwnerId)).toBe(UserRole.Member);
  });

  test('grants the role to an existing account, which then reads back as a maintainer', async () => {
    expect(await grantMaintainer(database.db, fixtureOwnerId)).toBe(true);
    expect(await roleOf(fixtureOwnerId)).toBe(UserRole.Maintainer);
  });

  test('an account that does not exist is reported, and nothing changes', async () => {
    expect(await grantMaintainer(database.db, newId())).toBe(false);
  });

  test('a value that is not an id is refused', async () => {
    expect(await rejection(grantMaintainer(database.db, 'amiri'))).toBeInstanceOf(Error);
  });
});
