import { describe, expect, test } from 'bun:test';

import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { compression, MIN_COMPRESSED_BYTES } from './compression';

const big = { text: 'x'.repeat(MIN_COMPRESSED_BYTES * 4) };

/** What `/versioned` sends and under which `ETag`; a test changes them between requests. */
const versioned = { etag: '"v1"', body: { text: 'a'.repeat(MIN_COMPRESSED_BYTES * 4) } as unknown };

function app(): AnyElysia {
  return new Elysia()
    .use(compression)
    .get('/versioned', ({ set }) => {
      set.headers.etag = versioned.etag;
      return versioned.body;
    })
    .get('/unversioned', ({ set }) => {
      set.headers.etag = 'W/"weak"';
      return versioned.body;
    })
    .get('/big', ({ set }) => {
      set.headers.etag = '"abc"';
      set.headers['cache-control'] = 'public, max-age=10';
      return big;
    })
    .get('/small', () => ({ ok: true }))
    .get('/text', () => 'x'.repeat(MIN_COMPRESSED_BYTES * 4));
}

async function get(path: string, acceptEncoding?: string): Promise<Response> {
  const headers: Record<string, string> = acceptEncoding === undefined ? {} : { 'accept-encoding': acceptEncoding };
  return app().handle(new Request(`http://localhost${path}`, { headers }));
}

async function gunzipped(response: Response): Promise<unknown> {
  const stream = response.body?.pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
}

describe('compression', () => {
  test('gzips a large JSON body for a client that accepts it', async () => {
    const response = await get('/big', 'gzip, br');
    expect(response.headers.get('content-encoding')).toBe('gzip');
    expect(response.headers.get('vary')).toBe('accept-encoding');
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(await gunzipped(response)).toEqual(big);
  });

  test('keeps the handler headers, with the ETag weakened', async () => {
    const response = await get('/big', 'gzip');
    expect(response.headers.get('cache-control')).toBe('public, max-age=10');
    expect(response.headers.get('etag')).toBe('W/"abc"');
  });

  test('leaves the body alone without accept-encoding', async () => {
    const response = await get('/big');
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(response.headers.get('etag')).toBe('"abc"');
    expect(await response.json()).toEqual(big);
  });

  test('leaves the body alone when gzip is refused', async () => {
    const response = await get('/big', 'gzip;q=0, identity');
    expect(response.headers.get('content-encoding')).toBeNull();
  });

  test('leaves a small body alone', async () => {
    const response = await get('/small', 'gzip');
    expect(response.headers.get('content-encoding')).toBeNull();
    expect(await response.json()).toEqual({ ok: true });
  });

  test('leaves a non-JSON body alone', async () => {
    const response = await get('/text', 'gzip');
    expect(response.headers.get('content-encoding')).toBeNull();
  });

  test('serves the kept bytes while the ETag is the same, and new ones under a new ETag', async () => {
    versioned.etag = '"v1"';
    versioned.body = { text: 'a'.repeat(MIN_COMPRESSED_BYTES * 4) };
    expect(await gunzipped(await get('/versioned', 'gzip'))).toEqual(versioned.body);
    versioned.body = { text: 'b'.repeat(MIN_COMPRESSED_BYTES * 4) };
    const kept = await get('/versioned', 'gzip');
    expect(await gunzipped(kept)).toEqual({ text: 'a'.repeat(MIN_COMPRESSED_BYTES * 4) });
    expect(kept.headers.get('etag')).toBe('W/"v1"');
    versioned.etag = '"v2"';
    expect(await gunzipped(await get('/versioned', 'gzip'))).toEqual(versioned.body);
  });

  test('never keeps a body under a weak ETag', async () => {
    versioned.body = { text: 'c'.repeat(MIN_COMPRESSED_BYTES * 4) };
    await get('/unversioned', 'gzip');
    versioned.body = { text: 'd'.repeat(MIN_COMPRESSED_BYTES * 4) };
    expect(await gunzipped(await get('/unversioned', 'gzip'))).toEqual(versioned.body);
  });
});
