import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { CORE_RULE_LIMITS } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import type { JsonObject } from '@pioneer/character/domain/testing';
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
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-17T10:00:00Z'));

  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

function request(path: string, as: UserId, body?: JsonObject): Request {
  const init: RequestInit = {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...actingAs(as) },
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request(`http://localhost${path}`, init);
}

describe('character rule-limit routes', () => {
  test('the owner reads the core rules’ limits, and another user gets a 404', async () => {
    const api = app();
    const created = await api.handle(request('/characters', ezren, { name: 'Seelah', ancestry: humanAncestryId }));
    // SAFETY: Response.json() is typed any.
    // This route's body has the shape its contract gives, and the test reads only the fields named here.
    const { id } = (await created.json()) as { id: string };

    const own = await api.handle(request(`/characters/${id}/rule-limits`, ezren));
    expect(own.status).toBe(200);
    expect(await own.json()).toStrictEqual(CORE_RULE_LIMITS);

    const refused = await api.handle(request(`/characters/${id}/rule-limits`, amiri));
    expect(refused.status).toBe(404);
  });
});
