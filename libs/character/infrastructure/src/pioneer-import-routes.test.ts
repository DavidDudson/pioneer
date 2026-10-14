import { describe, expect, test } from 'bun:test';

import {
  CharacterService,
  InMemoryCharacterRepository,
  InMemoryEmbeddedHomebrew,
  PioneerFileService,
} from '@pioneer/character/application';
import { CharacterId, CharacterListQuery, CharacterName } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import type { PioneerCharacterFile } from '@pioneer/interop/pioneer';
import type { ContentSource } from '@pioneer/rules/sdk';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';
import * as z from 'zod';

import { characterRoutes } from './character-routes';
import { pioneerFileRoutes } from './pioneer-file-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const clock = fixedClock('2026-10-07T10:00:00Z');
const kyra = CharacterName.parse('Kyra');
const NEWER_FORMAT = 99;
const everything = CharacterListQuery.parse({});

/** One pack loaded; `player-core` has the human ancestry Kyra is. */
function contentOf(pack: string): ContentSource {
  return fixedContent(new ContentPackBuilder().withId(pack).withAncestry('human').build());
}

/** A server over a repository with `pack` loaded: the character service, the file service and the routes of both. */
interface Server {
  readonly characters: CharacterService;
  readonly files: PioneerFileService;
  readonly app: AnyElysia;
}

function serverOver(repository: InMemoryCharacterRepository, pack = 'player-core'): Server {
  const auth = new FakeAuthenticator();
  const characters = new CharacterService(repository, contentOf(pack), clock);
  const files = new PioneerFileService({
    repository,
    content: contentOf(pack),
    clock,
    homebrew: new InMemoryEmbeddedHomebrew(),
  });
  const app = new Elysia()
    .use(problemHandler)
    .use(characterRoutes(characters, auth))
    .use(pioneerFileRoutes(files, auth));
  return { characters, files, app };
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
  const { characters, files } = serverOver(new InMemoryCharacterRepository());
  const { id } = await characters.create(amiri, { name: kyra, ancestry: humanAncestryId });
  return files.export(amiri, id);
}

describe('POST /characters/import/pioneer', () => {
  test("makes a new character of the importer with the exported character's stored inputs", async () => {
    const file = await exportedKyra();
    const { app, files } = serverOver(new InMemoryCharacterRepository());

    const response = await app.handle(request('/characters/import/pioneer', file, ezren));
    expect(response.status).toBe(200);

    const saved = z.object({ id: CharacterId, ownerId: UserId }).parse(await response.json());
    expect(saved.ownerId).toBe(ezren);
    const exportedAgain = await files.export(ezren, saved.id);
    expect(exportedAgain).toStrictEqual(file);
  });

  test('is a 401 with no signed-in user', async () => {
    const response = await serverOver(new InMemoryCharacterRepository()).app.handle(
      request('/characters/import/pioneer', await exportedKyra()),
    );
    expect(response.status).toBe(401);
  });

  test('refuses a newer format version with its own problem, saving nothing', async () => {
    const { app, characters } = serverOver(new InMemoryCharacterRepository());
    const file = { ...(await exportedKyra()), formatVersion: NEWER_FORMAT };

    const response = await app.handle(request('/characters/import/pioneer', file, ezren));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues?.[0]?.message.key).toBe('character.import.pioneer.problem.newerFormat');
    expect(await characters.list(ezren, everything)).toStrictEqual([]);
  });

  test('refuses anything that is not a Pioneer file as malformed', async () => {
    const response = await serverOver(new InMemoryCharacterRepository()).app.handle(
      request('/characters/import/pioneer', { hello: 'world' }, ezren),
    );
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues?.[0]?.message.key).toBe('character.import.pioneer.problem.malformed');
  });
});

describe('POST /characters/import/pioneer/preview', () => {
  test('lists no unmatched content when every entry is loaded, and saves nothing', async () => {
    const { app, characters } = serverOver(new InMemoryCharacterRepository());

    const response = await app.handle(request('/characters/import/pioneer/preview', await exportedKyra(), ezren));
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ name: 'Kyra', level: 1, homebrew: [], unmatched: [] });
    expect(await characters.list(ezren, everything)).toStrictEqual([]);
  });

  test('lists what no loaded pack has by kind', async () => {
    const { app } = serverOver(new InMemoryCharacterRepository(), 'other-pack');

    const response = await app.handle(request('/characters/import/pioneer/preview', await exportedKyra(), ezren));
    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({
      name: 'Kyra',
      level: 1,
      homebrew: [],
      unmatched: [{ kind: 'ancestry', entries: [{ source: 'player-core', slug: 'ancestry:human' }] }],
    });
  });
});

describe('a character imported with content no loaded pack has', () => {
  test('opens as a sheet and lists, keeping the content as ids', async () => {
    const file = await exportedKyra();
    const { app, characters } = serverOver(new InMemoryCharacterRepository(), 'other-pack');

    const created = await app.handle(request('/characters/import/pioneer', file, ezren));
    const { id } = z.object({ id: CharacterId }).parse(await created.json());

    const sheet = await app.handle(new Request(`http://localhost/characters/${id}`, { headers: actingAs(ezren) }));
    expect(sheet.status).toBe(200);
    expect(await characters.list(ezren, everything)).toHaveLength(1);
  });
});
