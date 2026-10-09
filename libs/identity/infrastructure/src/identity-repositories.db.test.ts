import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { hashSessionToken, IdentityService } from '@pioneer/identity/application';
import { DisplayName, OAuthProvider, SessionToken } from '@pioneer/identity/domain';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { Temporal } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq } from 'drizzle-orm';

import { DrizzleSessionRepository } from './drizzle-session-repository';
import { DrizzleUserRepository } from './drizzle-user-repository';
import { oauthAccounts, sessions, users } from './identity.table';

/** Runs against a throwaway Postgres database (see createTestDatabase); skipped without TEST_DATABASE_URL. */
const adminUrl = testDatabaseUrl();

describe.skipIf(adminUrl === undefined)('Drizzle identity repositories (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let now = Temporal.Instant.from('2026-10-09T08:00:00Z');
  const clock: Clock = { now: () => now };
  let service: IdentityService;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    service = new IdentityService(
      new DrizzleUserRepository(database.db),
      new DrizzleSessionRepository(database.db),
      clock,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('sign-in creates the user and account once, then refreshes the profile', async () => {
    const first = await service.signIn(new ProfileBuilder().withSubject('42').named('Kyra').build());
    const again = await service.signIn(new ProfileBuilder().withSubject('42').named('Kyra of Sarenrae').build());
    expect(again.user.id).toBe(first.user.id);
    expect(again.user.displayName).toBe(DisplayName.parse('Kyra of Sarenrae'));
    const authenticated = await service.authenticate(first.token);
    expect(authenticated?.displayName).toBe(DisplayName.parse('Kyra of Sarenrae'));
  });

  test('only the token hash is stored, and expired sessions do not authenticate', async () => {
    const { token, session } = await service.signIn(new ProfileBuilder().withSubject('43').build());
    const [row] = await database.db.select().from(sessions).where(eq(sessions.id, session.id));
    expect(row?.tokenHash).toBe(await hashSessionToken(token));
    expect(JSON.stringify(row)).not.toContain(token);

    now = now.add({ hours: 24 * 31 });
    expect(await service.authenticate(token)).toBeUndefined();
    now = Temporal.Instant.from('2026-10-09T08:00:00Z');
  });

  test('sign-out deletes the session', async () => {
    const { token } = await service.signIn(new ProfileBuilder().withSubject('44').build());
    await service.signOut(token);
    expect(await service.authenticate(token)).toBeUndefined();
    await service.signOut(SessionToken.parse('C'.repeat(43)));
  });

  test('a profile without an email clears the stored one', async () => {
    await service.signIn(new ProfileBuilder().withSubject('45').withEmail('ezren@example.com').build());
    const { user } = await service.signIn(new ProfileBuilder().withSubject('45').build());
    const [row] = await database.db.select().from(users).where(eq(users.id, user.id));
    expect(row?.email).toBeNull();
    expect(row?.emailVerified).toBe(false);
  });

  test('a verified email from another provider links to the existing user', async () => {
    const github = await service.signIn(new ProfileBuilder().withSubject('46').withEmail('seoni@example.com').build());
    const google = new ProfileBuilder().from(OAuthProvider.Google).withSubject('g-46').withEmail('seoni@example.com');
    const linked = await service.signIn(google.build());
    expect(linked.user.id).toBe(github.user.id);
    const accounts = await database.db.select().from(oauthAccounts).where(eq(oauthAccounts.userId, github.user.id));
    expect(accounts.map((account) => account.provider).toSorted()).toStrictEqual(['github', 'google']);
  });

  test('every query the repositories issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
