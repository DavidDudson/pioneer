import { describe, expect, test } from 'bun:test';

import { readEnv } from './env';

describe('readEnv', () => {
  test('defaults the port', () => {
    expect(readEnv({ DATABASE_URL: 'postgres://localhost/pioneer' }).PORT).toBe(3000);
  });

  test('rejects a non-postgres url', () => {
    expect(() => readEnv({ DATABASE_URL: 'mysql://localhost/pioneer' })).toThrow(/DATABASE_URL/u);
  });
});
