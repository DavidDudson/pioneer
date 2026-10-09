import { describe, expect, test } from 'bun:test';

import { SessionToken, TokenHash } from '@pioneer/identity/domain';

import { hashSessionToken, newSessionToken } from './session-tokens';

const SAMPLES = 200;

describe('session tokens', () => {
  test('are 256-bit base64url strings, all distinct', () => {
    const tokens = Array.from({ length: SAMPLES }, () => newSessionToken());
    expect(tokens.every((token) => SessionToken.safeParse(token).success)).toBe(true);
    expect(new Set(tokens).size).toBe(SAMPLES);
  });

  test('hash to the SHA-256 hex digest', async () => {
    const token = SessionToken.parse('A'.repeat(43));
    const expected = new Bun.CryptoHasher('sha256').update(token).digest('hex');
    expect(await hashSessionToken(token)).toBe(TokenHash.parse(expected));
  });
});
