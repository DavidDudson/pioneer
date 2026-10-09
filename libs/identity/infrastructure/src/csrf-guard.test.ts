import { describe, expect, test } from 'bun:test';

import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';

import { csrfGuard, isCrossSiteWrite } from './csrf-guard';

const SITE = 'https://pioneer.example';
const SESSION = `pioneer_session=${'A'.repeat(43)}`;

interface Case {
  readonly method: string;
  readonly cookie: boolean;
  readonly origin?: string;
  readonly fetchSite?: string;
}

function request({ method, cookie, origin, fetchSite }: Case): Request {
  const headers = new Headers();
  if (cookie) {
    headers.set('cookie', SESSION);
  }
  if (origin !== undefined) {
    headers.set('origin', origin);
  }
  if (fetchSite !== undefined) {
    headers.set('sec-fetch-site', fetchSite);
  }
  return new Request(`${SITE}/api/things`, { method, headers });
}

describe('isCrossSiteWrite', () => {
  test.each<[string, Case]>([
    ['a same-origin POST', { method: 'POST', cookie: true, origin: SITE }],
    ['a same-origin DELETE', { method: 'DELETE', cookie: true, origin: SITE }],
    ['a POST marked same-origin by fetch metadata', { method: 'POST', cookie: true, fetchSite: 'same-origin' }],
    ['a cross-site GET', { method: 'GET', cookie: true, origin: 'https://evil.example' }],
    ['a HEAD with no origin', { method: 'HEAD', cookie: true }],
    ['an OPTIONS preflight', { method: 'OPTIONS', cookie: true, origin: 'https://evil.example' }],
    ['a cross-site POST without the session cookie', { method: 'POST', cookie: false, origin: 'https://evil.example' }],
  ])('allows %s', (_name, input) => {
    expect(isCrossSiteWrite(request(input), SITE)).toBe(false);
  });

  test.each<[string, Case]>([
    ['a cross-site POST', { method: 'POST', cookie: true, origin: 'https://evil.example' }],
    ['a cross-site PATCH', { method: 'PATCH', cookie: true, origin: 'https://evil.example' }],
    ['a cross-site DELETE', { method: 'DELETE', cookie: true, origin: 'https://evil.example' }],
    ['a POST from a sibling subdomain', { method: 'POST', cookie: true, origin: 'https://evil.pioneer.example' }],
    ['a POST from the http origin', { method: 'POST', cookie: true, origin: 'http://pioneer.example' }],
    ['a POST with neither origin nor fetch metadata', { method: 'POST', cookie: true }],
    ['a POST with a null origin', { method: 'POST', cookie: true, origin: 'null' }],
    ['a POST marked same-site', { method: 'POST', cookie: true, fetchSite: 'same-site' }],
    ['a POST marked cross-site', { method: 'POST', cookie: true, origin: SITE, fetchSite: 'cross-site' }],
  ])('refuses %s', (_name, input) => {
    expect(isCrossSiteWrite(request(input), SITE)).toBe(true);
  });

  test('without a public origin, compares against the request origin', () => {
    const own = request({ method: 'POST', cookie: true, origin: SITE });
    expect(isCrossSiteWrite(own, undefined)).toBe(false);
    const foreign = request({ method: 'POST', cookie: true, origin: 'https://evil.example' });
    expect(isCrossSiteWrite(foreign, undefined)).toBe(true);
  });

  test('ignores a trailing slash on the public origin', () => {
    expect(isCrossSiteWrite(request({ method: 'POST', cookie: true, origin: SITE }), `${SITE}/`)).toBe(false);
  });
});

describe('csrfGuard', () => {
  const api = new Elysia()
    .use(problemHandler)
    .use(csrfGuard(SITE))
    .post('/api/things', () => ({ done: true }));

  test('a refused write is a 403 problem and never reaches the handler', async () => {
    const response = await api.handle(request({ method: 'POST', cookie: true, origin: 'https://evil.example' }));
    expect(response.status).toBe(403);
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('forbidden');
    expect(problem.message).toStrictEqual({ key: 'problem.forbidden' });
  });

  test('a same-origin write goes through', async () => {
    const response = await api.handle(request({ method: 'POST', cookie: true, origin: SITE }));
    expect(response.status).toBe(200);
  });
});
