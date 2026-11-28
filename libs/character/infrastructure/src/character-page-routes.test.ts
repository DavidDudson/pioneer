import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const kyra = UserId.parse(newId());

/** The part of a page of the list these tests read. */
interface PageBody {
  readonly items: ReadonlyArray<{ readonly name: string }>;
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

function app(): AnyElysia {
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));

  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

interface FacetBody {
  readonly items: ReadonlyArray<{ readonly value: string; readonly count: number }>;
  readonly total: number;
  readonly page: number;
}

async function get(api: AnyElysia, path: string): Promise<Response> {
  return api.handle(new Request(`http://localhost${path}`, { headers: actingAs(amiri) }));
}

async function pageAt(api: AnyElysia, path: string): Promise<PageBody> {
  const response = await get(api, path);

  // SAFETY: Response.json() is typed any.
  // This route's body has the shape its contract gives, and the test reads only the fields named here.
  return (await response.json()) as PageBody;
}

async function create(api: AnyElysia, name: string): Promise<void> {
  await api.handle(
    new Request('http://localhost/characters', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...actingAs(amiri) },
      body: JSON.stringify({ name, ancestry: humanAncestryId }),
    }),
  );
}

/** The list's path with one condition on it, as a client writes it. */
function withFilter(property: string, operator: string, values: ReadonlyArray<string>): string {
  const filters = JSON.stringify([{ property, operator, values }]);

  return `/characters?filters=${encodeURIComponent(filters)}`;
}

async function facetsAt(api: AnyElysia, path: string): Promise<FacetBody> {
  const response = await get(api, path);

  // SAFETY: Response.json() is typed any; the route's body has the contract's shape.
  return (await response.json()) as FacetBody;
}

describe('the character list page', () => {
  test('a page comes back with its total, and the name filter narrows it', async () => {
    const api = app();
    await create(api, 'Amiri');
    await create(api, 'Kyra');
    const everyone = await pageAt(api, '/characters');
    expect(everyone).toMatchObject({ total: 2, page: 1, pageSize: 24 });
    const named = await pageAt(api, withFilter('name', 'contains', ['kyr']));
    expect(named.items.map((character) => character.name)).toStrictEqual(['Kyra']);
    expect(named.total).toBe(1);
  });

  test('a level range that nobody is in is an empty page', async () => {
    const api = app();
    await create(api, 'Amiri');
    const page = await pageAt(api, withFilter('level', 'gte', ['2']));
    expect(page).toMatchObject({ items: [], total: 0 });
  });

  test.each([
    ['a page below the first', '/characters?page=0'],
    ['a page that is not a number', '/characters?page=next'],
    ['gt on a text property', withFilter('name', 'gt', ['a'])],
    ['a level that is not a number', withFilter('level', 'is', ['high'])],
    ['a property the list lacks', withFilter('owner', 'is', ['someone'])],
    ['filters that are not JSON', '/characters?filters=level'],
    ['a filter that is not one', '/characters?owner=someone'],
  ])('%s is a 422', async (_name, path) => {
    const response = await get(app(), path);
    expect(response.status).toBe(422);
  });
});

describe('the character facets', () => {
  test('counts the values of a property, most common first', async () => {
    const api = app();
    await create(api, 'Amiri');
    await create(api, 'Kyra');

    const body = await facetsAt(api, '/characters/facets?property=level');
    expect(body).toMatchObject({ items: [{ value: '1', count: 2 }], total: 1, page: 1 });
  });

  test('counts leave out the property’s own conditions', async () => {
    const api = app();
    await create(api, 'Amiri');
    const own = JSON.stringify([{ property: 'level', operator: 'gte', values: ['5'] }]);
    const body = await facetsAt(api, `/characters/facets?property=level&filters=${encodeURIComponent(own)}`);
    expect(body.items).toStrictEqual([{ value: '1', count: 1 }]);
  });

  test('another property’s conditions narrow the counts', async () => {
    const api = app();
    await create(api, 'Amiri');
    const other = JSON.stringify([{ property: 'name', operator: 'contains', values: ['zzz'] }]);
    const body = await facetsAt(api, `/characters/facets?property=level&filters=${encodeURIComponent(other)}`);
    expect(body).toMatchObject({ items: [], total: 0 });
  });

  test('counts cover only the caller’s own characters', async () => {
    const api = app();
    await create(api, 'Amiri');

    const response = await api.handle(
      new Request('http://localhost/characters/facets?property=level', { headers: actingAs(kyra) }),
    );

    // SAFETY: Response.json() is typed any; the route's body has the contract's shape.
    expect(((await response.json()) as FacetBody).items).toStrictEqual([]);
  });

  test.each([
    ['a text property', '/characters/facets?property=name'],
    ['no property', '/characters/facets'],
    ['a page below the first', '/characters/facets?property=level&page=0'],
  ])('%s is a 422', async (_name, path) => {
    const response = await get(app(), path);
    expect(response.status).toBe(422);
  });
});
