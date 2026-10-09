import { describe, expect, test } from 'bun:test';

import {
  IdentityService,
  InMemoryPreferencesRepository,
  InMemorySessionRepository,
  InMemoryUserRepository,
  OAuthProviderPort,
  PreferencesService,
} from '@pioneer/identity/application';
import type { AuthorizationRequest } from '@pioneer/identity/application';
import { OAuthProvider } from '@pioneer/identity/domain';
import type { ProviderProfile } from '@pioneer/identity/domain';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { fixedClock, Temporal } from '@pioneer/shared/kernel';
import type { Clock, Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { identityRoutes } from './identity-routes';

const GOOD_CODE = 'good-code';

/** Accepts `GOOD_CODE` with the verifier it issued; anything else fails like a real provider. */
class FakeProvider extends OAuthProviderPort {
  public readonly provider = OAuthProvider.GitHub;
  readonly #issued: AuthorizationRequest = {
    url: new URL('https://provider.example/authorize?state=s1'),
    state: 's1',
    codeVerifier: 'v1',
  };

  public override authorize(): AuthorizationRequest {
    return this.#issued;
  }

  public override async profile(code: string, codeVerifier: string): Promise<ProviderProfile> {
    if (code !== GOOD_CODE || codeVerifier !== this.#issued.codeVerifier) {
      throw new Error('bad_verification_code');
    }
    return new ProfileBuilder().named('Amiri').build();
  }
}

function app(clock: Clock = fixedClock('2026-10-09T08:00:00Z')): AnyElysia {
  const users = new InMemoryUserRepository();
  const service = new IdentityService(users, new InMemorySessionRepository(users), clock);
  const preferences = new PreferencesService(new InMemoryPreferencesRepository(), clock);
  return new Elysia()
    .use(problemHandler)
    .use(identityRoutes(service, preferences, [new FakeProvider()], { secure: true }));
}

/** `name=value` pairs from Set-Cookie headers, for the next request's Cookie header. */
function cookiesFrom(response: Response): Map<string, string> {
  const pairs = response.headers.getSetCookie().map((header) => header.split(';')[0] ?? '');
  return new Map(pairs.map((pair) => [pair.slice(0, pair.indexOf('=')), pair.slice(pair.indexOf('=') + 1)]));
}

function cookieHeader(cookies: ReadonlyMap<string, string>): string {
  return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
}

/** The session cookie a response set; fails the test when there is none. */
function sessionFrom(response: Response): string {
  const session = cookiesFrom(response).get('pioneer_session');
  expect(session).toBeDefined();
  return session ?? '';
}

async function login(api: AnyElysia, returnTo = '/'): Promise<Response> {
  const query = new URLSearchParams({ returnTo }).toString();
  return api.handle(new Request(`http://localhost/auth/github/login?${query}`));
}

async function returnFromProvider(api: AnyElysia, started: Response, query: string): Promise<Response> {
  const cookie = cookieHeader(cookiesFrom(started));
  return api.handle(new Request(`http://localhost/auth/github/callback?${query}`, { headers: { cookie } }));
}

async function signIn(api: AnyElysia, returnTo: string): Promise<Response> {
  const started = await login(api, returnTo);
  return returnFromProvider(api, started, `code=${GOOD_CODE}&state=s1`);
}

interface ListedSession {
  readonly id: string;
  readonly createdAt: string;
  readonly current: boolean;
}

async function meAs(api: AnyElysia, session: string): Promise<Response> {
  return api.handle(new Request('http://localhost/me', { headers: { cookie: `pioneer_session=${session}` } }));
}

async function sessionsOf(api: AnyElysia, session: string): Promise<ListedSession[]> {
  const response = await api.handle(
    new Request('http://localhost/me/sessions', { headers: { cookie: `pioneer_session=${session}` } }),
  );
  expect(response.status).toBe(200);
  return (await response.json()) as ListedSession[];
}

async function revoke(api: AnyElysia, session: string, id: string): Promise<Response> {
  return api.handle(
    new Request(`http://localhost/me/sessions/${id}`, {
      method: 'DELETE',
      headers: { cookie: `pioneer_session=${session}` },
    }),
  );
}

/** A preferences request, signed in as `session` when given. */
async function preferencesRequest(api: AnyElysia, session: string | undefined, patch?: unknown): Promise<Response> {
  const headers = new Headers(session === undefined ? {} : { cookie: `pioneer_session=${session}` });
  if (patch === undefined) {
    return api.handle(new Request('http://localhost/me/preferences', { headers }));
  }
  headers.set('content-type', 'application/json');
  return api.handle(
    new Request('http://localhost/me/preferences', { method: 'PATCH', headers, body: JSON.stringify(patch) }),
  );
}

describe('identity routes', () => {
  test('login redirects to the provider and stores the attempt in HttpOnly cookies', async () => {
    const response = await login(app(), '/characters');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://provider.example/authorize?state=s1');
    const headers = response.headers.getSetCookie();
    expect(headers).toHaveLength(3);
    expect(headers.filter((header) => header.includes('HttpOnly'))).toHaveLength(3);
    expect(headers.filter((header) => header.includes('Secure'))).toHaveLength(3);
    expect(headers.filter((header) => header.includes('SameSite=Lax'))).toHaveLength(3);
    expect(cookiesFrom(response).get('pioneer_oauth_return')).toBe(encodeURIComponent('/characters'));
  });

  test('callback signs in, sets the session cookie, clears the attempt and returns where the user started', async () => {
    const api = app();
    const response = await signIn(api, '/characters');
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/characters');
    expect(cookiesFrom(response).get('pioneer_oauth_state')).toBe('');
    const session = sessionFrom(response);
    expect(session).toMatch(/^[\w-]{43}$/u);

    const me = await api.handle(
      new Request('http://localhost/me', { headers: { cookie: `pioneer_session=${session}` } }),
    );
    expect(me.status).toBe(200);
    const user = (await me.json()) as { displayName: string };
    expect(user.displayName).toBe('Amiri');
  });

  test('an off-site returnTo goes home instead', async () => {
    const response = await signIn(app(), '//evil.example/steal');
    expect(response.headers.get('location')).toBe('/');
  });

  test.each([
    ['a mismatched state', 'code=good-code&state=forged'],
    ['a missing code', 'state=s1'],
    ['a provider error', 'error=access_denied&state=s1'],
    ['a rejected code', 'code=stale&state=s1'],
  ])('%s lands on the sign-in-failed page without a session', async (_case, query) => {
    const api = app();
    const response = await returnFromProvider(api, await login(api), query);
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('/account/sign-in-failed');
    expect(cookiesFrom(response).has('pioneer_session')).toBe(false);
  });

  test('a callback without the attempt cookies is refused', async () => {
    const response = await app().handle(
      new Request(`http://localhost/auth/github/callback?code=${GOOD_CODE}&state=s1`),
    );
    expect(response.headers.get('location')).toBe('/account/sign-in-failed');
  });

  test('lists the configured providers', async () => {
    const response = await app().handle(new Request('http://localhost/auth/providers'));
    expect(await response.json()).toStrictEqual(['github']);
  });

  test('/me without a session is a 401 problem', async () => {
    const response = await app().handle(new Request('http://localhost/me'));
    expect(response.status).toBe(401);
    const problem = (await response.json()) as Problem;
    expect(problem.message).toStrictEqual({ key: 'problem.unauthorized' });
  });

  test('sign-out ends the session and expires the cookie', async () => {
    const api = app();
    const session = sessionFrom(await signIn(api, '/'));
    const headers = { cookie: `pioneer_session=${session}` };
    const signOut = await api.handle(new Request('http://localhost/auth/sign-out', { method: 'POST', headers }));
    expect(signOut.status).toBe(200);
    expect(signOut.headers.get('set-cookie')).toContain('Max-Age=0');
    const me = await api.handle(new Request('http://localhost/me', { headers }));
    expect(me.status).toBe(401);
  });

  test('a request in the second half of the session re-issues the cookie with a full lifetime', async () => {
    let now = Temporal.Instant.from('2026-10-09T08:00:00Z');
    const api = app({ now: () => now });
    const session = sessionFrom(await signIn(api, '/'));
    const headers = { cookie: `pioneer_session=${session}` };

    const early = await api.handle(new Request('http://localhost/me', { headers }));
    expect(early.headers.get('set-cookie')).toBeNull();

    now = now.add({ hours: 24 * 16 });
    const late = await api.handle(new Request('http://localhost/me', { headers }));
    expect(late.status).toBe(200);
    expect(sessionFrom(late)).toBe(session);
    expect(late.headers.get('set-cookie')).toContain(`Max-Age=${24 * 30 * 3600}`);
  });

  test('lists the signed-in user sessions, marking the current one', async () => {
    const api = app();
    const laptop = sessionFrom(await signIn(api, '/'));
    await signIn(api, '/');
    const listed = await sessionsOf(api, laptop);
    expect(listed).toHaveLength(2);
    expect(listed.filter((each) => each.current)).toHaveLength(1);
    expect(listed.map((each) => each.createdAt)).toContain('2026-10-09T08:00:00.000Z');
  });

  test('revoking another session keeps the cookie; revoking the current one expires it', async () => {
    const api = app();
    const laptop = sessionFrom(await signIn(api, '/'));
    const phone = sessionFrom(await signIn(api, '/'));
    const listed = await sessionsOf(api, laptop);
    const ids = new Map(listed.map((each) => [each.current, each.id]));

    const revokeOther = await revoke(api, laptop, String(ids.get(false)));
    expect(revokeOther.status).toBe(200);
    expect(revokeOther.headers.get('set-cookie')).toBeNull();
    const phoneMe = await meAs(api, phone);
    expect(phoneMe.status).toBe(401);

    const revokeSelf = await revoke(api, laptop, String(ids.get(true)));
    expect(revokeSelf.headers.get('set-cookie')).toContain('Max-Age=0');
    const laptopMe = await meAs(api, laptop);
    expect(laptopMe.status).toBe(401);
  });

  test("revoking another user's session is a 404 problem", async () => {
    const api = app();
    const amiri = sessionFrom(await signIn(api, '/'));
    const response = await revoke(api, amiri, '0199d2a0-0000-7000-8000-00000000ffff');
    expect(response.status).toBe(404);
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('not-found');
  });

  test('sign out everywhere ends every session and expires the cookie', async () => {
    const api = app();
    const laptop = sessionFrom(await signIn(api, '/'));
    const phone = sessionFrom(await signIn(api, '/'));
    const response = await api.handle(
      new Request('http://localhost/auth/sign-out-everywhere', {
        method: 'POST',
        headers: { cookie: `pioneer_session=${laptop}` },
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
    const after = await Promise.all([meAs(api, laptop), meAs(api, phone)]);
    expect(after.map((each) => each.status)).toStrictEqual([401, 401]);
  });

  test('session endpoints need a session', async () => {
    const api = app();
    const list = await api.handle(new Request('http://localhost/me/sessions'));
    const everywhere = await api.handle(new Request('http://localhost/auth/sign-out-everywhere', { method: 'POST' }));
    expect([list.status, everywhere.status]).toStrictEqual([401, 401]);
  });
});

describe('preference routes', () => {
  test('a new account has nothing chosen', async () => {
    const api = app();
    const amiri = sessionFrom(await signIn(api, '/'));
    const response = await preferencesRequest(api, amiri);
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ uiLocale: null, contentLocale: null, distanceUnit: null });
  });

  test('PATCH changes only the given fields, null clears one, and GET reads them back', async () => {
    const api = app();
    const amiri = sessionFrom(await signIn(api, '/'));
    await preferencesRequest(api, amiri, { uiLocale: 'en', distanceUnit: 'metres' });
    const patched = await preferencesRequest(api, amiri, { uiLocale: null, contentLocale: 'en' });
    expect(patched.status).toBe(200);
    const expected = { uiLocale: null, contentLocale: 'en', distanceUnit: 'metres' };
    expect(await patched.json()).toStrictEqual(expected);
    const read = await preferencesRequest(api, amiri);
    expect(await read.json()).toStrictEqual(expected);
  });

  test.each([
    ['an unknown UI locale', { uiLocale: 'xx' }],
    ['an unknown content locale', { contentLocale: 'de' }],
    ['an unknown distance unit', { distanceUnit: 'leagues' }],
    ['an unknown field', { theme: 'tavern' }],
  ])('PATCH with %s is a 422 problem', async (_case, patch) => {
    const api = app();
    const amiri = sessionFrom(await signIn(api, '/'));
    const response = await preferencesRequest(api, amiri, patch);
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('validation');
  });

  test('preferences need a session, and a bad body without one is still a 401', async () => {
    const api = app();
    const read = await preferencesRequest(api, undefined);
    const write = await preferencesRequest(api, undefined, { uiLocale: 'en' });
    const invalid = await preferencesRequest(api, undefined, { uiLocale: 'xx' });
    expect([read.status, write.status, invalid.status]).toStrictEqual([401, 401, 401]);
  });
});
