import { describe, expect, test } from 'bun:test';

import { IdentityService, InMemorySessionRepository, InMemoryUserRepository } from '@pioneer/identity/application';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { fixedClock, UnauthorizedError } from '@pioneer/shared/kernel';
import type { Clock, Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import type { HTTPHeaders } from 'elysia';

import { SessionAuthenticator } from './session-authenticator';

/** A clock tests can move forward. */
class MovableClock implements Clock {
  #now: Temporal.Instant = fixedClock('2026-10-09T08:00:00Z').now();

  public now(): Temporal.Instant {
    return this.#now;
  }

  public advance(days: number): void {
    this.#now = this.#now.add({ hours: days * 24 });
  }
}

interface Harness {
  readonly clock: MovableClock;
  readonly service: IdentityService;
  readonly auth: SessionAuthenticator;
}

function setup(): Harness {
  const clock = new MovableClock();
  const users = new InMemoryUserRepository();
  const service = new IdentityService(users, new InMemorySessionRepository(users), clock);
  return { clock, service, auth: new SessionAuthenticator(service, { secure: true }) };
}

function withCookie(cookie?: string): Request {
  return new Request('http://localhost/characters', cookie === undefined ? {} : { headers: { cookie } });
}

describe(SessionAuthenticator, () => {
  test('a valid session is its user', async () => {
    const { service, auth } = setup();
    const { user, token } = await service.signIn(new ProfileBuilder().named('Amiri').build());
    const actor = await auth.actingUser({ request: withCookie(`pioneer_session=${token}`), responseHeaders: {} });
    expect(actor).toBe(user.id);
  });

  test('no cookie, an unknown token or a signed-out session is a 401', async () => {
    const { service, auth } = setup();
    const { token } = await service.signIn(new ProfileBuilder().named('Amiri').build());
    await service.signOut(token);
    const requests = [withCookie(), withCookie('pioneer_session=nonsense'), withCookie(`pioneer_session=${token}`)];
    const errors = await Promise.all(
      requests.map(async (request) => rejection(auth.actingUser({ request, responseHeaders: {} }))),
    );
    for (const error of errors) {
      expect(error).toBeInstanceOf(UnauthorizedError);
    }
  });

  test('a session renewed by the request gets its cookie re-issued', async () => {
    const { clock, service, auth } = setup();
    const { token } = await service.signIn(new ProfileBuilder().named('Amiri').build());
    clock.advance(20);
    const responseHeaders: HTTPHeaders = {};
    await auth.actingUser({ request: withCookie(`pioneer_session=${token}`), responseHeaders });
    expect(String(responseHeaders['set-cookie'])).toStartWith(`pioneer_session=${token}`);
  });
});
