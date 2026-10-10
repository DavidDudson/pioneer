import { describe, expect, test } from 'bun:test';

import { assertLocalOrigin, isCrossSiteRequest } from './local-only';

function withFetchSite(site?: string): Request {
  return new Request(
    'http://localhost/api/auth/dev/x',
    site === undefined ? {} : { headers: { 'sec-fetch-site': site } },
  );
}

describe(assertLocalOrigin, () => {
  test.each(['http://localhost:4201', 'http://127.0.0.1:4200', 'http://[::1]:4200'])('starts for %s', (origin) => {
    expect(() => {
      assertLocalOrigin(origin);
    }).not.toThrow();
  });

  test.each([
    'https://localhost:4200',
    'https://pioneer.example',
    'http://pioneer.example',
    'http://192.168.1.20:4200',
    undefined,
  ])('refuses %s', (origin) => {
    expect(() => {
      assertLocalOrigin(origin);
    }).toThrow('Refusing to start dev sign-in');
  });
});

describe('cross-site requests', () => {
  test.each(['same-origin', 'none', undefined])('lets %s through', (site) => {
    expect(isCrossSiteRequest(withFetchSite(site))).toBe(false);
  });

  test.each(['cross-site', 'same-site'])('refuses %s', (site) => {
    expect(isCrossSiteRequest(withFetchSite(site))).toBe(true);
  });
});
