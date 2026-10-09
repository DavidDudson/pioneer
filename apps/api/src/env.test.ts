import { describe, expect, test } from 'bun:test';

import { readEnv, readHealthEnv, readMigrateEnv } from './env';

const DATABASE_URL = 'postgres://localhost/pioneer';

describe('readEnv', () => {
  test('defaults the port', () => {
    expect(readEnv({ DATABASE_URL }).PORT).toBe(3000);
  });

  test('defaults the migrations folder to the repo and migrates on start', () => {
    const env = readEnv({ DATABASE_URL });
    expect(env.MIGRATIONS_DIR).toEndWith('/apps/api/src/../migrations');
    expect(env.MIGRATE_ON_START).toBe(true);
  });

  test('reads the migrations folder and the migrate-on-start flag', () => {
    const env = readEnv({ DATABASE_URL, MIGRATIONS_DIR: '/app/migrations', MIGRATE_ON_START: 'false' });
    expect(env.MIGRATIONS_DIR).toBe('/app/migrations');
    expect(env.MIGRATE_ON_START).toBe(false);
  });

  test('rejects an empty migrations folder and a flag that is not a boolean', () => {
    expect(() => readEnv({ DATABASE_URL, MIGRATIONS_DIR: '' })).toThrow(/MIGRATIONS_DIR/u);
    expect(() => readEnv({ DATABASE_URL, MIGRATE_ON_START: 'sometimes' })).toThrow(/MIGRATE_ON_START/u);
  });

  test('rejects a non-postgres url', () => {
    expect(() => readEnv({ DATABASE_URL: 'mysql://localhost/pioneer' })).toThrow(/DATABASE_URL/u);
  });

  test('sign-in providers are optional', () => {
    expect(readEnv({ DATABASE_URL }).GITHUB_CLIENT_ID).toBeUndefined();
  });

  test('each provider is checked on its own', () => {
    expect(() =>
      readEnv({ DATABASE_URL, DISCORD_CLIENT_SECRET: 'secret', PUBLIC_ORIGIN: 'https://pioneer.example' }),
    ).toThrow(/DISCORD_CLIENT_ID/u);
    const env = readEnv({
      DATABASE_URL,
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      PUBLIC_ORIGIN: 'https://pioneer.example',
    });
    expect(env.GOOGLE_CLIENT_ID).toBe('id');
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

describe('readMigrateEnv', () => {
  test('reads only the database and the migrations folder', () => {
    expect(readMigrateEnv({ DATABASE_URL, MIGRATIONS_DIR: '/app/migrations', PORT: '80' })).toStrictEqual({
      DATABASE_URL,
      MIGRATIONS_DIR: '/app/migrations',
    });
  });

  test('ignores server settings the server would reject', () => {
    expect(() => readEnv({ DATABASE_URL, GITHUB_CLIENT_ID: 'id', PORT: 'web' })).toThrow(/PORT/u);
    expect(readMigrateEnv({ DATABASE_URL, GITHUB_CLIENT_ID: 'id', PORT: 'web' }).DATABASE_URL).toBe(DATABASE_URL);
  });

  test('still requires a postgres url', () => {
    expect(() => readMigrateEnv({})).toThrow(/DATABASE_URL/u);
  });
});

describe('readHealthEnv', () => {
  test('reads only the port, defaulting it like the server', () => {
    expect(readHealthEnv({ PORT: '8080', GITHUB_CLIENT_ID: 'id' })).toStrictEqual({ PORT: 8080 });
    expect(readHealthEnv({}).PORT).toBe(readEnv({ DATABASE_URL }).PORT);
  });

  test('rejects a port that is not a number', () => {
    expect(() => readHealthEnv({ PORT: 'web' })).toThrow(/PORT/u);
  });
});
