import { describe, expect, test } from 'bun:test';

import {
  CharacterCompanionService,
  CharacterService,
  InMemoryCharacterCompanionRepository,
  InMemoryCharacterRepository,
} from '@pioneer/character/application';
import type { CharacterId } from '@pioneer/character/domain';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { ContentPackBuilder, fixedContent } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterCompanionRoutes } from './character-companion-routes';
import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const NOW = '2026-11-15T10:00:00Z';

function api(): AnyElysia {
  const clock = fixedClock(NOW);
  const content = fixedContent(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const repository = new InMemoryCharacterRepository();

  const companions = new CharacterCompanionService(
    { characters: repository, companions: new InMemoryCharacterCompanionRepository() },
    clock,
  );

  const auth = new FakeAuthenticator();

  return new Elysia()
    .use(problemHandler)
    .use(characterRoutes(new CharacterService(repository, content, clock), auth))
    .use(characterCompanionRoutes(companions, auth));
}

interface Init {
  readonly method?: string;
  readonly body?: object;
}

function request(path: string, as: UserId, { method = 'GET', body }: Init = {}): Request {
  const init: RequestInit = { method, headers: { 'content-type': 'application/json', ...actingAs(as) } };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  return new Request(`http://localhost${path}`, init);
}

interface Created {
  readonly id: CharacterId;
  readonly version: number;
}

async function createdBy(server: AnyElysia, owner: UserId): Promise<Created> {
  const response = await server.handle(
    request('/characters', owner, { method: 'POST', body: { name: 'Seelah', ancestry: humanAncestryId } }),
  );

  // SAFETY: the create endpoint answers with the character it made, whose id and version `Created` names.
  return (await response.json()) as Created;
}

/** The body that adds a familiar. */
interface PipBody {
  readonly kind: 'familiar';
  readonly name: 'Pip';
  readonly form: Record<string, never>;
  readonly grantedBy: 'witch-lesson:0';
  readonly expectedVersion: number;
}

/** A familiar called Pip, granted by the witch's lesson slot. */
function pip(version: number): PipBody {
  return { kind: 'familiar', name: 'Pip', form: {}, grantedBy: 'witch-lesson:0', expectedVersion: version };
}

describe('character companion routes', () => {
  test('a character without a familiar lists none', async () => {
    const server = api();
    const { id } = await createdBy(server, amiri);

    const response = await server.handle(request(`/characters/${id}/companions`, amiri));

    expect(response.status).toBe(200);
    expect(await response.json()).toStrictEqual({ companions: [] });
  });

  test('the owner adds a familiar and reads it back', async () => {
    const server = api();
    const { id, version } = await createdBy(server, amiri);

    const added = await server.handle(
      request(`/characters/${id}/companions`, amiri, { method: 'POST', body: pip(version) }),
    );

    const listed = await server.handle(request(`/characters/${id}/companions`, amiri));

    expect(added.status).toBe(200);
    // SAFETY: the list endpoint answers with the companions, of which the test reads the name and kind.
    const { companions } = (await listed.json()) as { companions: { name: string; kind: string }[] };
    expect(companions.map((each) => [each.name, each.kind])).toStrictEqual([['Pip', 'familiar']]);
  });

  test('a second live familiar is a 409', async () => {
    const server = api();
    const { id, version } = await createdBy(server, amiri);

    const first = await server.handle(
      request(`/characters/${id}/companions`, amiri, { method: 'POST', body: pip(version) }),
    );

    const second = await server.handle(
      request(`/characters/${id}/companions`, amiri, { method: 'POST', body: pip(version) }),
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(409);
  });

  test('another user reads and writes as if the character were missing', async () => {
    const server = api();
    const { id, version } = await createdBy(server, amiri);

    const read = await server.handle(request(`/characters/${id}/companions`, ezren));

    const write = await server.handle(
      request(`/characters/${id}/companions`, ezren, { method: 'POST', body: pip(version) }),
    );

    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
  });

  test('a familiar with no name is a 422', async () => {
    const server = api();
    const { id, version } = await createdBy(server, amiri);

    const response = await server.handle(
      request(`/characters/${id}/companions`, amiri, { method: 'POST', body: { ...pip(version), name: ' ' } }),
    );

    expect(response.status).toBe(422);
  });
});
