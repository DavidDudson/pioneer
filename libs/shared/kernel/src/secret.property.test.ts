import { describe, expect, test } from 'bun:test';

import { randomSecret, sha256Hex } from './secret';

const SAMPLES = 200;

describe('secrets', () => {
  test('are 256-bit base64url strings, all distinct', () => {
    const secrets = Array.from({ length: SAMPLES }, () => randomSecret());
    expect(secrets.every((secret) => /^[\w-]{43}$/u.test(secret))).toBe(true);
    expect(new Set(secrets).size).toBe(SAMPLES);
  });

  test('hash to the SHA-256 hex digest', async () => {
    const secret = 'A'.repeat(43);
    expect(await sha256Hex(secret)).toBe(new Bun.CryptoHasher('sha256').update(secret).digest('hex'));
  });
});
