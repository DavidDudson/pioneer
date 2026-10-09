import { describe, expect, test } from 'bun:test';

import { readEnv } from './env';

const DATABASE_URL = 'postgres://localhost/pioneer';

describe('readEnv', () => {
  test('defaults the port', () => {
    expect(readEnv({ DATABASE_URL }).PORT).toBe(3000);
  });

  test('rejects a non-postgres url', () => {
    expect(() => readEnv({ DATABASE_URL: 'mysql://localhost/pioneer' })).toThrow(/DATABASE_URL/u);
  });

  test('sign-in providers are optional', () => {
    expect(readEnv({ DATABASE_URL }).GITHUB_CLIENT_ID).toBeUndefined();
  });

  test('a provider needs both its credentials and the public origin', () => {
    expect(() => readEnv({ DATABASE_URL, GITHUB_CLIENT_ID: 'id', PUBLIC_ORIGIN: 'http://localhost:4200' })).toThrow(
      /GITHUB_CLIENT_SECRET/u,
    );
    expect(() => readEnv({ DATABASE_URL, GITHUB_CLIENT_ID: 'id', GITHUB_CLIENT_SECRET: 'secret' })).toThrow(
      /PUBLIC_ORIGIN/u,
    );
    const env = readEnv({
      DATABASE_URL,
      GITHUB_CLIENT_ID: 'id',
      GITHUB_CLIENT_SECRET: 'secret',
      PUBLIC_ORIGIN: 'https://pioneer.example',
    });
    expect(env.GITHUB_CLIENT_ID).toBe('id');
  });
});
