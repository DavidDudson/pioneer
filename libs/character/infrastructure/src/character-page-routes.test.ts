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

/** The part of a page of the list these tests read. */
interface PageBody {
  readonly items: readonly { readonly name: string }[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
}

function app(): AnyElysia {
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

async function get(api: AnyElysia, path: string): Promise<Response> {
  return api.handle(new Request(`http://localhost${path}`, { headers: actingAs(amiri) }));
}

async function pageAt(api: AnyElysia, path: string): Promise<PageBody> {
  const response = await get(api, path);
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

describe('the character list page', () => {
  test('a page comes back with its total, and the name filter narrows it', async () => {
    const api = app();
    await create(api, 'Amiri');
    await create(api, 'Kyra');
    const everyone = await pageAt(api, '/characters');
    expect(everyone).toMatchObject({ total: 2, page: 1, pageSize: 24 });
    const named = await pageAt(api, '/characters?name=kyr');
    expect(named.items.map((character) => character.name)).toStrictEqual(['Kyra']);
    expect(named.total).toBe(1);
  });

  test('a level range that nobody is in is an empty page', async () => {
    const api = app();
    await create(api, 'Amiri');
    const page = await pageAt(api, '/characters?minLevel=2');
    expect(page).toMatchObject({ items: [], total: 0 });
  });

  test.each([
    ['a page below the first', '/characters?page=0'],
    ['a page that is not a number', '/characters?page=next'],
    ['a level above 20', '/characters?maxLevel=21'],
    ['a class that is not an id', '/characters?classId=fighter'],
    ['a filter that is not one', '/characters?owner=someone'],
  ])('%s is a 422', async (_name, path) => {
    const response = await get(app(), path);
    expect(response.status).toBe(422);
  });
});
