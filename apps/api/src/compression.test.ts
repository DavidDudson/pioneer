import { describe, expect, test } from 'bun:test';

import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { compression, MIN_COMPRESSED_BYTES } from './compression';

const big = { text: 'x'.repeat(MIN_COMPRESSED_BYTES * 4) };

function app(): AnyElysia {
  return new Elysia()
    .use(compression)
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
});
