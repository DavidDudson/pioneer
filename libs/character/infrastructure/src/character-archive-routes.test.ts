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
const ezren = UserId.parse(newId());

function app(): AnyElysia {
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();
  const service = new CharacterService(repository, content, fixedClock('2026-10-15T08:00:00Z'));
  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

/** No signed-in user. */
const anonymous = Symbol('anonymous');

interface RequestOptions {
  /** The acting user; `anonymous` sends none. */
  readonly as?: UserId | typeof anonymous;
  readonly body?: unknown;
}

function request(method: string, path: string, { as = amiri, body }: RequestOptions = {}): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(as === anonymous ? {} : actingAs(as)) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

/** The part of a created character these tests need. */
interface Created {
  readonly id: string;
}

/** The id of a character `amiri` has just created. */
async function created(api: AnyElysia): Promise<string> {
  const response = await api.handle(
    request('POST', '/characters', { body: { name: 'Ezren', ancestry: humanAncestryId } }),
  );
  const character = (await response.json()) as Created;
  return character.id;
}

async function status(api: AnyElysia, sent: Request): Promise<number> {
  const response = await api.handle(sent);
  return response.status;
}

async function bodyOf(api: AnyElysia, path: string): Promise<unknown> {
  const response = await api.handle(request('GET', path));
  return response.json();
}

describe('archived character routes (ADR-0062)', () => {
  test('archive hides the character, restore brings it back', async () => {
    const api = app();
    const id = await created(api);
    expect(await status(api, request('POST', `/characters/${id}/archive`))).toBe(200);
    expect(await status(api, request('GET', `/characters/${id}`))).toBe(404);
    expect(await bodyOf(api, '/characters')).toStrictEqual([]);
    expect(await bodyOf(api, '/characters/archived')).toHaveLength(1);

    expect(await status(api, request('POST', `/characters/${id}/restore`))).toBe(200);
    expect(await status(api, request('GET', `/characters/${id}`))).toBe(200);
  });

  test('an edit to an archived character is a 404', async () => {
    const api = app();
    const id = await created(api);
    await api.handle(request('POST', `/characters/${id}/archive`));
    const body = { expectedVersion: 1, patch: { field: 'level', value: 2 } };
    expect(await status(api, request('PATCH', `/characters/${id}`, { body }))).toBe(404);
  });

  test("someone else's character is a 404 and signed out is a 401", async () => {
    const api = app();
    const id = await created(api);
    expect(await status(api, request('POST', `/characters/${id}/archive`, { as: ezren }))).toBe(404);
    expect(await status(api, request('POST', `/characters/${id}/archive`, { as: anonymous }))).toBe(401);
    expect(await status(api, request('GET', '/characters/archived', { as: anonymous }))).toBe(401);
  });
});
