import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  DisplayName,
  NO_TABLE_VIEW_PREFERENCES,
  TableColumnId,
  TableDensity,
  TableEntity,
  UserId,
} from '@pioneer/identity/domain';
import { newId, Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq } from 'drizzle-orm';

import { DrizzleTableViewRepository } from './drizzle-table-view-repository';
import { users, userTableViews } from './identity.table';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = Temporal.Instant.from('2026-10-09T08:00:00Z');
const LATER = NOW.add({ minutes: 1 });
const CHARACTERS = TableEntity.parse('characters');
const CAMPAIGNS = TableEntity.parse('campaigns');
const NAME = TableColumnId.parse('name');
const LEVEL = TableColumnId.parse('level');

describe.skipIf(adminUrl === undefined)('DrizzleTableViewRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let views: DrizzleTableViewRepository;

  /** A fresh account to hang views on. */
  async function newUser(): Promise<UserId> {
    const id = UserId.parse(newId());
    const at = NOW.toString();
    const displayName = DisplayName.parse('Amiri');
    await database.db.insert(users).values({ id, displayName, emailVerified: false, createdAt: at, updatedAt: at });

    return id;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    views = new DrizzleTableViewRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a table nobody changed has nothing chosen', async () => {
    const amiri = await newUser();
    expect(await views.findFor({ userId: amiri, entity: CHARACTERS })).toStrictEqual(NO_TABLE_VIEW_PREFERENCES);
  });

  test('saving replaces the whole document and stamps the time', async () => {
    const amiri = await newUser();
    await views.save(
      { userId: amiri, entity: CHARACTERS },
      { columns: [NAME, LEVEL], density: TableDensity.Compact },
      NOW,
    );
    const replaced = await views.save({ userId: amiri, entity: CHARACTERS }, { columns: [NAME] }, LATER);
    expect(replaced).toStrictEqual({ columns: [NAME] });
    expect(await views.findFor({ userId: amiri, entity: CHARACTERS })).toStrictEqual({ columns: [NAME] });

    const rows = await database.db
      .select({ updatedAt: userTableViews.updatedAt })
      .from(userTableViews)
      .where(eq(userTableViews.userId, amiri));

    const stamped = rows.map((row) => Temporal.Instant.from(row.updatedAt).epochMilliseconds);
    expect(stamped).toStrictEqual([LATER.epochMilliseconds]);
  });

  test('each table and each user keeps their own', async () => {
    const amiri = await newUser();
    const kyra = await newUser();
    await views.save({ userId: amiri, entity: CHARACTERS }, { density: TableDensity.Compact }, NOW);
    expect(await views.findFor({ userId: amiri, entity: CAMPAIGNS })).toStrictEqual(NO_TABLE_VIEW_PREFERENCES);
    expect(await views.findFor({ userId: kyra, entity: CHARACTERS })).toStrictEqual(NO_TABLE_VIEW_PREFERENCES);
  });

  test('views need an existing user', async () => {
    const unknown = UserId.parse(newId());
    expect(await rejection(views.save({ userId: unknown, entity: CHARACTERS }, {}, NOW))).toBeInstanceOf(Error);
  });

  test('deleting a user deletes their views', async () => {
    const amiri = await newUser();
    await views.save({ userId: amiri, entity: CHARACTERS }, { density: TableDensity.Compact }, NOW);
    await database.db.delete(users).where(eq(users.id, amiri));
    const rows = await database.db.select().from(userTableViews).where(eq(userTableViews.userId, amiri));
    expect(rows).toStrictEqual([]);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
