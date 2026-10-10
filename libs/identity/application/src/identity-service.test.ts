import { describe, expect, test } from 'bun:test';

import { DisplayName, OAuthProvider, SessionId, SessionToken } from '@pioneer/identity/domain';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { NotFoundError, Temporal, UnauthorizedError } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { IdentityService } from './identity-service';
import { InMemorySessionRepository } from './in-memory-session-repository';
import { InMemoryUserRepository } from './in-memory-user-repository';
import { hashSessionToken } from './session-tokens';

interface Harness {
  readonly service: IdentityService;
  readonly sessions: InMemorySessionRepository;
  readonly users: InMemoryUserRepository;
  readonly advance: (duration: Temporal.DurationLike) => void;
}

function harness(): Harness {
  let now = Temporal.Instant.from('2026-10-09T08:00:00Z');
  const clock: Clock = { now: () => now };
  const users = new InMemoryUserRepository();
  const sessions = new InMemorySessionRepository(users);
  return {
    service: new IdentityService(users, sessions, clock),
    sessions,
    users,
    advance: (duration): void => {
      now = now.add(duration);
    },
  };
}

describe('IdentityService', () => {
  test('first sign-in creates the account; the session token authenticates it', async () => {
    const { service } = harness();
    const { user, token } = await service.signIn(new ProfileBuilder().named('Amiri').build());
    expect(user.displayName).toBe(DisplayName.parse('Amiri'));
    const authenticated = await service.authenticate(token);
    expect(authenticated?.user.id).toBe(user.id);
  });

  test('a session started for an existing account authenticates as that account', async () => {
    const { service } = harness();
    const { user, session: first } = await service.signIn(new ProfileBuilder().named('Amiri').build());
    const { token, session } = await service.startSession(user.id);
    expect(session.id).not.toBe(first.id);
    const authenticated = await service.authenticate(token);
    expect(authenticated?.user.id).toBe(user.id);
    expect(authenticated?.session.id).toBe(session.id);
  });

  test('the same provider account signs in to the same user, with its new profile', async () => {
    const { service } = harness();
    const first = await service.signIn(new ProfileBuilder().named('Amiri').build());
    const again = await service.signIn(new ProfileBuilder().named('Amiri the Bold').build());
    expect(again.user.id).toBe(first.user.id);
    expect(again.user.displayName).toBe(DisplayName.parse('Amiri the Bold'));
    expect(again.token).not.toBe(first.token);
  });

  test('a different provider account is a different user', async () => {
    const { service } = harness();
    const amiri = await service.signIn(new ProfileBuilder().withSubject('1').build());
    const ezren = await service.signIn(new ProfileBuilder().withSubject('2').build());
    expect(ezren.user.id).not.toBe(amiri.user.id);
  });

  test('a verified email from another provider signs in to the same user', async () => {
    const { service, users } = harness();
    const github = await service.signIn(new ProfileBuilder().withSubject('1').withEmail('amiri@example.com').build());
    const google = await service.signIn(
      new ProfileBuilder().from(OAuthProvider.Google).withSubject('g-1').withEmail('Amiri@Example.com').build(),
    );
    expect(google.user.id).toBe(github.user.id);
    expect(users.size).toBe(1);

    const again = await service.signIn(new ProfileBuilder().from(OAuthProvider.Google).withSubject('g-1').build());
    expect(again.user.id).toBe(github.user.id);
  });

  test('an unverified email never links, on either side', async () => {
    const { service, users } = harness();
    await service.signIn(new ProfileBuilder().withSubject('1').withEmail('amiri@example.com', false).build());
    const verified = new ProfileBuilder().from(OAuthProvider.Discord).withSubject('d-1').withEmail('amiri@example.com');
    await service.signIn(verified.build());
    const unverified = new ProfileBuilder().from(OAuthProvider.Google).withSubject('g-1');
    await service.signIn(unverified.withEmail('amiri@example.com', false).build());
    expect(users.size).toBe(3);
  });

  test('linking picks the oldest matching user', async () => {
    const { service, advance } = harness();
    const first = await service.signIn(new ProfileBuilder().withSubject('1').withEmail('kyra@example.com').build());
    advance({ hours: 1 });
    await service.signIn(new ProfileBuilder().from(OAuthProvider.Discord).withSubject('d-9').build());
    const linked = await service.signIn(
      new ProfileBuilder().from(OAuthProvider.Google).withSubject('g-2').withEmail('kyra@example.com').build(),
    );
    expect(linked.user.id).toBe(first.user.id);
  });

  test('only the hash is stored', async () => {
    const { service } = harness();
    const { token, session } = await service.signIn(new ProfileBuilder().build());
    expect(session.tokenHash).toBe(await hashSessionToken(token));
    expect(session.tokenHash).not.toContain(token);
  });

  test('an unused session expires after 30 days', async () => {
    const { service, advance } = harness();
    const { token } = await service.signIn(new ProfileBuilder().build());
    advance({ hours: 24 * 30 });
    expect(await service.authenticate(token)).toBeUndefined();
  });

  test('use in the second half of its life renews a session for 30 days from then', async () => {
    const { service, sessions, advance } = harness();
    const { token, session } = await service.signIn(new ProfileBuilder().build());
    advance({ hours: 24 * 14 });
    const early = await service.authenticate(token);
    expect(early?.renewed).toBe(false);
    expect(early?.session.expiresAt).toEqual(session.expiresAt);

    advance({ hours: 24 * 2 });
    const late = await service.authenticate(token);
    expect(late?.renewed).toBe(true);
    expect(late?.session.expiresAt).toEqual(session.createdAt.add({ hours: 24 * 46 }));
    expect(sessions.get(session.tokenHash)?.expiresAt).toEqual(late?.session.expiresAt);

    advance({ hours: 24 * 29 });
    expect(await service.authenticate(token)).toBeDefined();
  });

  test('last seen is recorded at most hourly', async () => {
    const { service, sessions, advance } = harness();
    const { token, session } = await service.signIn(new ProfileBuilder().build());
    advance({ minutes: 59 });
    await service.authenticate(token);
    expect(sessions.get(session.tokenHash)?.lastSeenAt).toEqual(session.createdAt);
    advance({ minutes: 1 });
    await service.authenticate(token);
    expect(sessions.get(session.tokenHash)?.lastSeenAt).toEqual(session.createdAt.add({ hours: 1 }));
  });

  test('lists the user own unexpired sessions, most recently seen first, marking the current one', async () => {
    const { service, advance } = harness();
    const profile = new ProfileBuilder().withSubject('1').build();
    const laptop = await service.signIn(profile);
    advance({ hours: 2 });
    const phone = await service.signIn(profile);
    await service.signIn(new ProfileBuilder().withSubject('2').build());
    advance({ hours: 2 });
    const current = await service.requireSession(laptop.token);

    const listed = await service.listSessions(current);
    expect(listed.map(({ id, current: isCurrent }) => [id, isCurrent])).toEqual([
      [laptop.session.id, true],
      [phone.session.id, false],
    ]);
  });

  test('revoking a session ends it; revoking the current one reports it', async () => {
    const { service } = harness();
    const profile = new ProfileBuilder().build();
    const laptop = await service.signIn(profile);
    const phone = await service.signIn(profile);
    const current = await service.requireSession(laptop.token);

    expect(await service.revokeSession(current, phone.session.id)).toEqual({ current: false });
    expect(await service.authenticate(phone.token)).toBeUndefined();
    expect(await service.revokeSession(current, laptop.session.id)).toEqual({ current: true });
    expect(await service.authenticate(laptop.token)).toBeUndefined();
  });

  test("revoking another user's session, or an unknown one, is not found and changes nothing", async () => {
    const { service } = harness();
    const amiri = await service.signIn(new ProfileBuilder().withSubject('1').build());
    const ezren = await service.signIn(new ProfileBuilder().withSubject('2').build());
    const current = await service.requireSession(amiri.token);

    expect(await rejection(service.revokeSession(current, ezren.session.id))).toBeInstanceOf(NotFoundError);
    expect(await service.authenticate(ezren.token)).toBeDefined();
    const unknown = SessionId.parse('0199d2a0-0000-7000-8000-00000000ffff');
    expect(await rejection(service.revokeSession(current, unknown))).toBeInstanceOf(NotFoundError);
  });

  test("signing out everywhere ends all of the user's sessions and nobody else's", async () => {
    const { service } = harness();
    const profile = new ProfileBuilder().withSubject('1').build();
    const laptop = await service.signIn(profile);
    const phone = await service.signIn(profile);
    const ezren = await service.signIn(new ProfileBuilder().withSubject('2').build());

    await service.signOutEverywhere(await service.requireSession(laptop.token));
    expect(await service.authenticate(laptop.token)).toBeUndefined();
    expect(await service.authenticate(phone.token)).toBeUndefined();
    expect(await service.authenticate(ezren.token)).toBeDefined();
  });

  test('the sweep deletes expired sessions only', async () => {
    const { service, sessions, advance } = harness();
    await service.signIn(new ProfileBuilder().withSubject('1').build());
    advance({ hours: 24 * 20 });
    const fresh = await service.signIn(new ProfileBuilder().withSubject('2').build());
    advance({ hours: 24 * 10 });
    expect(await service.sweepExpired()).toBe(1);
    expect(sessions.size).toBe(1);
    expect(await service.authenticate(fresh.token)).toBeDefined();
  });

  test('unknown, missing and signed-out tokens do not authenticate', async () => {
    const { service, sessions } = harness();
    const { token } = await service.signIn(new ProfileBuilder().build());
    expect(await service.authenticate(undefined)).toBeUndefined();
    const unknown = SessionToken.parse('A'.repeat(43));
    expect(await service.authenticate(unknown)).toBeUndefined();
    await service.signOut(token);
    expect(await service.authenticate(token)).toBeUndefined();
    expect(sessions.size).toBe(0);
    expect(await rejection(service.requireSession(token))).toBeInstanceOf(UnauthorizedError);
  });

  test('signing out without a session is a no-op', async () => {
    const { service } = harness();
    await service.signOut(undefined);
    await service.signOut(SessionToken.parse('B'.repeat(43)));
  });
});
