import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignRole } from '@pioneer/campaign/domain';
import { campaignMembers, campaigns } from '@pioneer/campaign/infrastructure';
import { IdentityService } from '@pioneer/identity/application';
import { DEV_USERS, DevUser } from '@pioneer/identity/dev-users';
import { DrizzleSessionRepository, DrizzleUserRepository, users } from '@pioneer/identity/infrastructure';
import { fixedClock, Temporal } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';

import { seedDevData } from './seed';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-10T08:00:00Z');

describe.skipIf(adminUrl === undefined)('seedDevData (postgres)', () => {
  let database: TestDatabase;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
  });

  afterAll(async () => {
    await database.drop();
  });

  test('seeds the dev users and their campaign, and a reseed changes nothing', async () => {
    await seedDevData(database.db, clock);
    await seedDevData(database.db, fixedClock('2026-10-11T08:00:00Z'));

    const seededUsers = await database.db.select().from(users);
    expect(seededUsers.map(({ id, displayName }) => ({ id, displayName }))).toStrictEqual(
      DEV_USERS.map(({ id, displayName }) => ({ id, displayName })),
    );
    expect(seededUsers.map(({ createdAt }) => Temporal.Instant.from(createdAt).toString())).toStrictEqual(
      DEV_USERS.map(() => clock.now().toString()),
    );
    const [campaign, ...others] = await database.db.select().from(campaigns);
    expect(others).toStrictEqual([]);
    expect(campaign?.gmId).toBe(DevUser.Gm.id);
    const members = await database.db.select().from(campaignMembers);
    expect(members.map(({ userId, role }) => ({ userId, role }))).toStrictEqual([
      { userId: DevUser.Gm.id, role: CampaignRole.Gm },
      { userId: DevUser.PlayerOne.id, role: CampaignRole.Player },
      { userId: DevUser.PlayerTwo.id, role: CampaignRole.Player },
    ]);
  });

  test('a session started for a seeded user authenticates as them', async () => {
    await seedDevData(database.db, clock);
    const service = new IdentityService(
      new DrizzleUserRepository(database.db),
      new DrizzleSessionRepository(database.db),
      clock,
    );
    const { token } = await service.startSession(DevUser.PlayerTwo.id);
    const authenticated = await service.authenticate(token);
    expect(authenticated?.user.displayName).toBe(DevUser.PlayerTwo.displayName);
  });
});
