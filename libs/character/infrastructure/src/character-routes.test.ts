import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { fixedClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';

function app(): AnyElysia {
  const content = new ContentRegistry();
  content.register(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
  return new Elysia().use(problemHandler).use(characterRoutes(service));
}

const json = (method: string, body?: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  ...(body === undefined ? {} : { body: JSON.stringify(body) }),
});

describe('character routes', () => {
  test('create, patch, conflict', async () => {
    const api = app();
    const created = await api.handle(
      new Request('http://localhost/characters', json('POST', { name: 'Ezren', ancestry: humanAncestryId })),
    );
    expect(created.status).toBe(200);
    const character = (await created.json()) as { id: string; version: number; createdAt: string };
    expect(character.version).toBe(1);
    expect(character.createdAt).toBe('2026-10-07T10:00:00.000Z');

    const patch = { expectedVersion: 1, patch: { field: 'level', value: 5 } };
    const patched = await api.handle(new Request(`http://localhost/characters/${character.id}`, json('PATCH', patch)));
    expect(((await patched.json()) as { level: number }).level).toBe(5);

    const stale = await api.handle(new Request(`http://localhost/characters/${character.id}`, json('PATCH', patch)));
    expect(stale.status).toBe(409);
    expect(stale.headers.get('content-type')).toContain('application/problem+json');
  });

  test('invalid body is 422', async () => {
    const response = await app().handle(new Request('http://localhost/characters', json('POST', { name: '' })));
    expect(response.status).toBe(422);
  });
});

describe('character list query', () => {
  test('only enumerated sort options are accepted', async () => {
    const api = app();
    const ok = await api.handle(new Request('http://localhost/characters?sort=name&direction=desc'));
    expect(ok.status).toBe(200);
    const raw = await api.handle(new Request('http://localhost/characters?sort=password'));
    expect(raw.status).toBe(422);
    const filter = await api.handle(new Request('http://localhost/characters?where=1%3D1'));
    expect(filter.status).toBe(422);
  });
});
