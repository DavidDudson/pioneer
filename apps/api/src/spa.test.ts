import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { spa } from './spa';

const root = `${Bun.env['TMPDIR'] ?? '/tmp'}/pioneer-spa-${crypto.randomUUID()}`;
const files: Readonly<Record<string, string>> = {
  'index.html': '<pio-root></pio-root>',
  'chunk-BgoYYQMx.js': 'export {};',
  'favicon.ico': 'icon',
};

beforeAll(async () => {
  await Promise.all(Object.entries(files).map(async ([name, body]) => Bun.write(`${root}/${name}`, body)));
});

afterAll(async () => {
  await Promise.all(Object.keys(files).map(async (name) => Bun.file(`${root}/${name}`).delete()));
});

async function get(path: string): Promise<Response> {
  return spa(root).handle(new Request(`http://localhost${path}`));
}

describe('spa', () => {
  test('serves content-hashed chunks as immutable', async () => {
    const response = await get('/chunk-BgoYYQMx.js');
    expect(await response.text()).toBe('export {};');
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
  });

  test('makes unhashed files revalidate', async () => {
    const response = await get('/favicon.ico');
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });

  test('falls back to index.html for client routes, revalidated', async () => {
    const response = await get('/characters/42');
    expect(await response.text()).toBe('<pio-root></pio-root>');
    expect(response.headers.get('cache-control')).toBe('no-cache');
  });
});
