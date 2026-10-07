import { describe, expect, test } from 'bun:test';

import { z } from 'zod';

import { Endpoint, HttpMethod, NoBody } from './endpoint';

const getThing = new Endpoint({
  method: HttpMethod.Get,
  path: '/things/:id/parts/:part',
  params: z.object({ id: z.uuid(), part: z.number().int() }),
  body: NoBody,
  response: z.object({ ok: z.boolean() }),
});

describe('Endpoint', () => {
  test('url substitutes and encodes params', () => {
    expect(getThing.url({ id: '0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10', part: 2 })).toBe(
      '/things/0d9f7c1e-3b7a-4c55-9d1f-2a8f2b9c6e10/parts/2',
    );
  });
});
