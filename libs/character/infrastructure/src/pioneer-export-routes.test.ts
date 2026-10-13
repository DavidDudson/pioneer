import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { CharacterName } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { PioneerCharacterFile, readPioneerCharacter } from '@pioneer/interop/pioneer';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');
const kyra = CharacterName.parse('Kyra');

/** A service over a repository, with the `player-core` pack loaded (its human ancestry is what Kyra is). */
function serviceOver(repository: InMemoryCharacterRepository): CharacterService {
  return new CharacterService(
    repository,
    fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build()),
    clock,
  );
}

function appOver(service: CharacterService): AnyElysia {
  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

function get(path: string, as?: UserId): Request {
  return new Request(`http://localhost${path}`, { headers: as === undefined ? {} : actingAs(as) });
}

describe('GET /characters/:id/export', () => {
  test('gives the owner a file that passes the schema and reads back as the same inputs', async () => {
    const service = serviceOver(new InMemoryCharacterRepository());
    const { id, ownerId, document } = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });

    const response = await appOver(service).handle(get(`/characters/${id}/export`, amiri));
    expect(response.status).toBe(200);
    const file = PioneerCharacterFile.parse(await response.json());
    expect(file.character).not.toHaveProperty('id');
    expect(file.character).not.toHaveProperty('ownerId');
    expect(readPioneerCharacter(file, { id, ownerId })).toStrictEqual({ ok: true, character: document });
  });

  test("is a 404 for another user's character, the same as a missing one", async () => {
    const service = serviceOver(new InMemoryCharacterRepository());
    const { id } = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });

    const response = await appOver(service).handle(get(`/characters/${id}/export`, ezren));
    expect(response.status).toBe(404);
  });

  test('is a 401 with no signed-in user', async () => {
    const service = serviceOver(new InMemoryCharacterRepository());
    const { id } = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });

    const response = await appOver(service).handle(get(`/characters/${id}/export`));
    expect(response.status).toBe(401);
  });

  test('is a 422 naming how many things no pack has, not a file that loses them', async () => {
    const repository = new InMemoryCharacterRepository();
    const { id } = await serviceOver(repository).create(amiri, { name: kyra, ancestry: humanAncestryId });
    const bare = new CharacterService(
      repository,
      fixedContent(new ContentPackBuilder().withId('empty').build()),
      clock,
    );

    const response = await appOver(bare).handle(get(`/characters/${id}/export`, amiri));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues).toStrictEqual([
      { path: ['content'], message: { key: 'character.validation.exportUnnamedContent', params: { count: 1 } } },
    ]);
  });
});
