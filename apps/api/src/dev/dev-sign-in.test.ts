import { describe, expect, test } from 'bun:test';

import { IdentityService, InMemorySessionRepository, InMemoryUserRepository } from '@pioneer/identity/application';
import { DevSignInPath, DevUser } from '@pioneer/identity/dev-users';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { devSignInRoutes } from './dev-sign-in';

function app(): AnyElysia {
  const users = new InMemoryUserRepository();
  const service = new IdentityService(users, new InMemorySessionRepository(users), fixedClock('2026-10-10T08:00:00Z'));
  return new Elysia().use(problemHandler).use(devSignInRoutes({ service, policy: { secure: false } }));
}

async function signInAs(id: UserId, returnTo?: string): Promise<Response> {
  const query = returnTo === undefined ? '' : `?${new URLSearchParams({ returnTo }).toString()}`;
  return app().handle(new Request(`http://localhost${DevSignInPath.of(id)}${query}`));
}

describe('dev sign-in', () => {
  test('a seeded user gets a session cookie and goes back where they were', async () => {
    const response = await signInAs(DevUser.PlayerOne.id, '/campaigns');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/campaigns');
    const [cookie] = response.headers.getSetCookie();
    expect(cookie).toStartWith('pioneer_session=');
    expect(cookie).toContain('HttpOnly');
  });

  test('never returns off-site', async () => {
    const response = await signInAs(DevUser.Gm.id, 'https://evil.example/');
    expect(response.headers.get('location')).toBe('/');
  });

  test('any other user is a 404 with no session', async () => {
    const response = await signInAs(UserId.parse(newId()));
    expect(response.status).toBe(404);
    expect(response.headers.getSetCookie()).toStrictEqual([]);
  });
});
