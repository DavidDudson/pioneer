import { describe, expect, test } from 'bun:test';

import {
  IdentityService,
  InMemorySessionRepository,
  InMemoryUserRepository,
  OAuthProviderPort,
} from '@pioneer/identity/application';
import type { AuthorizationRequest } from '@pioneer/identity/application';
import { OAuthProvider } from '@pioneer/identity/domain';
import type { ProviderProfile } from '@pioneer/identity/domain';
import { ProfileBuilder } from '@pioneer/identity/domain/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
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

function app(): AnyElysia {
  const users = new InMemoryUserRepository();
  const clock = fixedClock('2026-10-09T08:00:00Z');
  const service = new IdentityService(users, new InMemorySessionRepository(users), clock);
  return new Elysia().use(problemHandler).use(identityRoutes(service, [new FakeProvider()], { secure: true }));
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
});
