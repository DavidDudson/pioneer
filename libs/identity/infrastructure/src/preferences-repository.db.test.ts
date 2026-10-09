import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { DisplayName, NO_PREFERENCES, UserId } from '@pioneer/identity/domain';
import { DistanceUnit, Locale, newId, Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq } from 'drizzle-orm';

import { DrizzlePreferencesRepository } from './drizzle-preferences-repository';
import { userPreferences, users } from './identity.table';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();
const NOW = Temporal.Instant.from('2026-10-09T08:00:00Z');
const LATER = NOW.add({ minutes: 1 });

describe.skipIf(adminUrl === undefined)('DrizzlePreferencesRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let preferences: DrizzlePreferencesRepository;

  /** A fresh account to hang preferences on. */
  async function newUser(): Promise<UserId> {
    const id = UserId.parse(newId());
    const at = NOW.toString();
    const displayName = DisplayName.parse('Amiri');
    await database.db.insert(users).values({ id, displayName, emailVerified: false, createdAt: at, updatedAt: at });
    return id;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    preferences = new DrizzlePreferencesRepository(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a user who never chose has nothing chosen', async () => {
    const amiri = await newUser();
    expect(await preferences.findFor(amiri)).toStrictEqual(NO_PREFERENCES);
  });

  test('updates upsert only the given fields and stamp the time', async () => {
    const amiri = await newUser();
    await preferences.update(amiri, { uiLocale: Locale.English }, NOW);
    const updated = await preferences.update(amiri, { distanceUnit: DistanceUnit.Metres }, LATER);
    expect(updated).toEqual({ uiLocale: Locale.English, distanceUnit: DistanceUnit.Metres });
    expect(await preferences.findFor(amiri)).toEqual(updated);

    const rows = await database.db
      .select({ updatedAt: userPreferences.updatedAt })
      .from(userPreferences)
      .where(eq(userPreferences.id, amiri));
    const stamped = rows.map((row) => Temporal.Instant.from(row.updatedAt).epochMilliseconds);
    expect(stamped).toStrictEqual([LATER.epochMilliseconds]);
  });

  test('preferences need an existing user', async () => {
    const unknown = UserId.parse(newId());
    expect(await rejection(preferences.update(unknown, { uiLocale: Locale.English }, NOW))).toBeInstanceOf(Error);
  });

  test('deleting a user deletes their preferences', async () => {
    const amiri = await newUser();
    await preferences.update(amiri, { distanceUnit: DistanceUnit.Metres }, NOW);
    await database.db.delete(users).where(eq(users.id, amiri));
    const rows = await database.db.select().from(userPreferences).where(eq(userPreferences.id, amiri));
    expect(rows).toStrictEqual([]);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
