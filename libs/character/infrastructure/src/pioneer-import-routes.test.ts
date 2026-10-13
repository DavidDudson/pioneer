import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { CharacterId, CharacterListQuery, CharacterName } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import type { PioneerCharacterFile } from '@pioneer/interop/pioneer';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';
import * as z from 'zod';

import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');
const kyra = CharacterName.parse('Kyra');
const NEWER_FORMAT = 99;
const everything = CharacterListQuery.parse({});

function serviceOver(repository: InMemoryCharacterRepository, pack = 'player-core'): CharacterService {
  return new CharacterService(
    repository,
    fixedContent(new ContentPackBuilder().withId(pack).withAncestry('human').build()),
    clock,
  );
}

function appOver(service: CharacterService): AnyElysia {
  return new Elysia().use(problemHandler).use(characterRoutes(service, new FakeAuthenticator()));
}

function request(path: string, body: unknown, as?: UserId): Request {
  return new Request(`http://localhost${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    body: JSON.stringify(body),
  });
}

/** Kyra exported by `amiri` from a server that has the `player-core` pack. */
async function exportedKyra(): Promise<PioneerCharacterFile> {
  const service = serviceOver(new InMemoryCharacterRepository());
  const { id } = await service.create(amiri, { name: kyra, ancestry: humanAncestryId });
  return service.exportPioneer(amiri, id);
}

describe('POST /characters/import/pioneer', () => {
  test("makes a new character of the importer with the exported character's stored inputs", async () => {
    const file = await exportedKyra();
    const repository = new InMemoryCharacterRepository();
    const service = serviceOver(repository);

    const response = await appOver(service).handle(request('/characters/import/pioneer', file, ezren));
    expect(response.status).toBe(200);

    const saved = z.object({ id: CharacterId, ownerId: UserId }).parse(await response.json());
    expect(saved.ownerId).toBe(ezren);
    const exportedAgain = await service.exportPioneer(ezren, saved.id);
    expect(exportedAgain).toStrictEqual(file);
  });

  test('is a 401 with no signed-in user', async () => {
    const response = await appOver(serviceOver(new InMemoryCharacterRepository())).handle(
      request('/characters/import/pioneer', await exportedKyra()),
    );
    expect(response.status).toBe(401);
  });

  test('refuses a newer format version with its own problem, saving nothing', async () => {
    const repository = new InMemoryCharacterRepository();
    const service = serviceOver(repository);
    const file = { ...(await exportedKyra()), formatVersion: NEWER_FORMAT };

    const response = await appOver(service).handle(request('/characters/import/pioneer', file, ezren));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues?.[0]?.message.key).toBe('character.import.pioneer.problem.newerFormat');
    expect(await service.list(ezren, everything)).toStrictEqual([]);
  });

  test('refuses anything that is not a Pioneer file as malformed', async () => {
    const response = await appOver(serviceOver(new InMemoryCharacterRepository())).handle(
      request('/characters/import/pioneer', { hello: 'world' }, ezren),
    );
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues?.[0]?.message.key).toBe('character.import.pioneer.problem.malformed');
  });
});

describe('POST /characters/import/pioneer/preview', () => {
  test('lists no unmatched content when every entry is loaded, and saves nothing', async () => {
    const repository = new InMemoryCharacterRepository();
    const service = serviceOver(repository);

    const response = await appOver(service).handle(
      request('/characters/import/pioneer/preview', await exportedKyra(), ezren),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ name: 'Kyra', level: 1, unmatched: [] });
    expect(await service.list(ezren, everything)).toStrictEqual([]);
  });

  test('lists what no loaded pack has by kind', async () => {
    const bare = serviceOver(new InMemoryCharacterRepository(), 'other-pack');

    const response = await appOver(bare).handle(
      request('/characters/import/pioneer/preview', await exportedKyra(), ezren),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      name: 'Kyra',
      level: 1,
      unmatched: [{ kind: 'ancestry', entries: [{ source: 'player-core', slug: 'ancestry:human' }] }],
    });
  });
});

describe('a character imported with content no loaded pack has', () => {
  test('opens as a sheet and lists, keeping the content as ids', async () => {
    const file = await exportedKyra();
    const bare = serviceOver(new InMemoryCharacterRepository(), 'other-pack');
    const app = appOver(bare);

    const created = await app.handle(request('/characters/import/pioneer', file, ezren));
    const { id } = z.object({ id: CharacterId }).parse(await created.json());

    const sheet = await app.handle(new Request(`http://localhost/characters/${id}`, { headers: actingAs(ezren) }));
    expect(sheet.status).toBe(200);
    expect(await bare.list(ezren, everything)).toHaveLength(1);
  });
});
