import { describe, expect, test } from 'bun:test';

import { InMemoryPreferencesRepository, PreferencesService } from '@pioneer/identity/application';
import { UserId } from '@pioneer/identity/domain';
import { fixedClock, newId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { preferenceRoutes } from './preference-routes';

function app(): AnyElysia {
  const preferences = new PreferencesService(new InMemoryPreferencesRepository(), fixedClock('2026-10-09T08:00:00Z'));
  return new Elysia().use(problemHandler).use(preferenceRoutes(preferences, new FakeAuthenticator()));
}

async function read(api: AnyElysia, user?: UserId): Promise<Response> {
  const headers = user === undefined ? {} : actingAs(user);
  return api.handle(new Request('http://localhost/me/preferences', { headers }));
}

async function patch(api: AnyElysia, body: unknown, user?: UserId): Promise<Response> {
  const headers = { 'content-type': 'application/json', ...(user === undefined ? {} : actingAs(user)) };
  return api.handle(
    new Request('http://localhost/me/preferences', { method: 'PATCH', headers, body: JSON.stringify(body) }),
  );
}

describe('preference routes', () => {
  test('a new account has nothing chosen', async () => {
    const response = await read(app(), UserId.parse(newId()));
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({});
  });

  test('PATCH changes only the given fields and GET reads them back', async () => {
    const api = app();
    const amiri = UserId.parse(newId());
    await patch(api, { uiLocale: 'en' }, amiri);
    const patched = await patch(api, { distanceUnit: 'metres' }, amiri);
    expect(patched.status).toBe(200);
    expect(await patched.json()).toStrictEqual({ uiLocale: 'en', distanceUnit: 'metres' });
    const again = await read(api, amiri);
    expect(await again.json()).toStrictEqual({ uiLocale: 'en', distanceUnit: 'metres' });
  });

  test("one user's preferences never show for another", async () => {
    const api = app();
    await patch(api, { distanceUnit: 'metres' }, UserId.parse(newId()));
    const other = await read(api, UserId.parse(newId()));
    expect(await other.json()).toStrictEqual({});
  });

  test.each([
    ['an unknown UI locale', { uiLocale: 'xx' }],
    ['an unknown content locale', { contentLocale: 'de' }],
    ['an unknown distance unit', { distanceUnit: 'leagues' }],
    ['an unknown field', { theme: 'tavern' }],
    ['a removed choice', { uiLocale: undefined, distanceUnit: false }],
  ])('PATCH with %s is a 422 problem', async (_case, body) => {
    const response = await patch(app(), body, UserId.parse(newId()));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('validation');
  });

  test('preferences need a session, and a bad body without one is still a 401', async () => {
    const api = app();
    const responses = await Promise.all([read(api), patch(api, { uiLocale: 'en' }), patch(api, { uiLocale: 'xx' })]);
    expect(responses.map((response) => response.status)).toStrictEqual([401, 401, 401]);
  });
});
