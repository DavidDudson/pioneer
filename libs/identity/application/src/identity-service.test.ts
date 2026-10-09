import { describe, expect, test } from 'bun:test';

import { DisplayName, SessionToken } from '@pioneer/identity/domain';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { Temporal, UnauthorizedError } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { IdentityService } from './identity-service';
import { InMemorySessionRepository } from './in-memory-session-repository';
import { InMemoryUserRepository } from './in-memory-user-repository';
import { hashSessionToken } from './session-tokens';

interface Harness {
  readonly service: IdentityService;
  readonly sessions: InMemorySessionRepository;
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
    expect(authenticated?.id).toBe(user.id);
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

  test('only the hash is stored', async () => {
    const { service } = harness();
    const { token, session } = await service.signIn(new ProfileBuilder().build());
    expect(session.tokenHash).toBe(await hashSessionToken(token));
    expect(session.tokenHash).not.toContain(token);
  });

  test('sessions expire after 30 days', async () => {
    const { service, advance } = harness();
    const { token } = await service.signIn(new ProfileBuilder().build());
    advance({ hours: 24 * 30 - 1 });
    expect(await service.authenticate(token)).toBeDefined();
    advance({ hours: 1 });
    expect(await service.authenticate(token)).toBeUndefined();
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
    expect(await rejection(service.requireUser(token))).toBeInstanceOf(UnauthorizedError);
  });

  test('signing out without a session is a no-op', async () => {
    const { service } = harness();
    await service.signOut(undefined);
    await service.signOut(SessionToken.parse('B'.repeat(43)));
  });
});
