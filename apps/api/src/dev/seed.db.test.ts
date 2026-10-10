import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignRole } from '@pioneer/campaign/domain';
import { campaignMembers, campaigns } from '@pioneer/campaign/infrastructure';
import { IdentityService } from '@pioneer/identity/application';
import { DEV_USERS, DevSignInPath, DevUser } from '@pioneer/identity/dev-users';
import {
  DrizzleSessionRepository,
  DrizzleUserRepository,
  oauthAccounts,
  users,
} from '@pioneer/identity/infrastructure';
import { fixedClock, Temporal } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';

import { createApp } from '../app';
import { readEnv } from '../env';
import type { Env } from '../env';
import { devSignInRoutes } from './dev-sign-in';
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
    expect(seededUsers.map(({ emailVerified }) => emailVerified)).toStrictEqual(DEV_USERS.map(() => false));
    expect(await database.db.select().from(oauthAccounts)).toStrictEqual([]);
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

describe.skipIf(adminUrl === undefined)('dev sign-in through createApp (postgres)', () => {
  let database: TestDatabase;
  let env: Env;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    env = readEnv({ DATABASE_URL: adminUrl ?? '', PUBLIC_ORIGIN: 'http://localhost:4200' });
    await seedDevData(database.db, clock);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('is mounted under /api and signs in as the seeded user', async () => {
    const api = await createApp(database.db, env, [devSignInRoutes]);
    const signIn = await api.handle(
      new Request(`http://localhost:4200/api${DevSignInPath.of(DevUser.Gm.id)}?returnTo=%2Fcampaigns`, {
        headers: { 'sec-fetch-site': 'same-origin' },
      }),
    );
    expect(signIn.status).toBe(302);
    const [setCookie] = signIn.headers.getSetCookie();
    expect(setCookie).toBeDefined();
    const cookie = String(setCookie).split(';', 1).join('');
    const me = await api.handle(new Request('http://localhost:4200/api/me', { headers: { cookie } }));
    const user = (await me.json()) as { readonly displayName: string };
    expect(user.displayName).toBe(DevUser.Gm.displayName);
  });
});
