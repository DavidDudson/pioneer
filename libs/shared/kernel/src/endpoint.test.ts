import { describe, expect, test } from 'bun:test';

import * as z from 'zod';

import { Endpoint, HttpMethod, NoBody, NoQuery } from './endpoint';
import { listQuery, SortDirection } from './list-query';

const getThing = new Endpoint({
  method: HttpMethod.Get,
  path: '/things/:id/parts/:part',
  params: z.object({ id: z.uuid(), part: z.number().int() }),
  query: NoQuery,
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

const Sort = { Name: 'name', CreatedAt: 'created-at' } as const;
const listThings = new Endpoint({
  method: HttpMethod.Get,
  path: '/things',
  params: z.object({}),
  query: listQuery(Sort, Sort.Name),
  body: NoBody,
  response: z.array(z.string()),
});

describe('Endpoint query', () => {
  test('url appends the encoded query', () => {
    expect(listThings.url({}, { sort: Sort.CreatedAt, direction: SortDirection.Desc })).toBe(
      '/things?sort=created-at&direction=desc',
    );
  });

  test('list queries default, and reject unknown sorts and unknown parameters', () => {
    expect(listThings.query.parse({})).toStrictEqual({ sort: 'name', direction: 'asc' });
    expect(listThings.query.safeParse({ sort: 'password' }).success).toBe(false);
    expect(listThings.query.safeParse({ filter: 'name = 1' }).success).toBe(false);
  });
});
