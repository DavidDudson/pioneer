import { describe, expect, test } from 'bun:test';

import * as z from 'zod';

import { ContentSearchQuery } from './content-search';

const PACK = '6f1f6e0e-6a5f-5a3e-9c0f-2f3b7d1c4a10';

/** `value` as plain data, so a test compares it with unbranded literals. */
function plain(value: unknown): unknown {
  return structuredClone(value);
}

describe('ContentSearchQuery', () => {
  test('only the words are required; everything else has a default', () => {
    expect(plain(ContentSearchQuery.parse({ query: 'fireball' }))).toStrictEqual({
      query: 'fireball',
      locale: 'en',
      kinds: [],
      packs: [],
      limit: 50,
      offset: 0,
    });
  });

  test('the words are trimmed, and blank words are refused', () => {
    expect(String(ContentSearchQuery.parse({ query: '  fire ball ' }).query)).toBe('fire ball');
    expect(ContentSearchQuery.safeParse({ query: '   ' }).success).toBe(false);
  });

  test('kinds and packs are comma-separated, and the numbers are read from text', () => {
    const query = ContentSearchQuery.parse({ query: 'x', kinds: 'spell,feat', packs: PACK, limit: '10', offset: '20' });

    expect(plain(query)).toStrictEqual({
      query: 'x',
      locale: 'en',
      kinds: ['spell', 'feat'],
      packs: [PACK],
      limit: 10,
      offset: 20,
    });
  });

  test('an unknown kind, a page that is too large and a stray parameter are refused', () => {
    expect(ContentSearchQuery.safeParse({ query: 'x', kinds: 'dragon' }).success).toBe(false);
    expect(ContentSearchQuery.safeParse({ query: 'x', limit: '1000' }).success).toBe(false);
    expect(ContentSearchQuery.safeParse({ query: 'x', sort: 'name' }).success).toBe(false);
  });

  test('encodes for the wire as the server reads it', () => {
    const query = ContentSearchQuery.parse({ query: 'x', kinds: 'spell,feat' });

    expect(z.encode(ContentSearchQuery, query)).toMatchObject({ query: 'x', kinds: 'spell,feat', packs: '' });
  });
});
