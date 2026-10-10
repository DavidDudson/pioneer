import { describe, expect, test } from 'bun:test';

import { CharacterService, InMemoryCharacterRepository } from '@pioneer/character/application';
import { humanAncestryId } from '@pioneer/character/domain/testing';
import { briarRoseExport, mordredExport } from '@pioneer/interop/pathbuilder/testing';
import { ContentRegistry } from '@pioneer/rules/sdk';
import { ContentPackBuilder } from '@pioneer/rules/sdk/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { characterRoutes } from './character-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

function app(): AnyElysia {
  const content = new ContentRegistry();
  content.register(new ContentPackBuilder().withId('player-core').withAncestry('human').build());
  const service = new CharacterService(new InMemoryCharacterRepository(), content, fixedClock('2026-10-07T10:00:00Z'));
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

async function create(api: AnyElysia, as: UserId, name: string): Promise<Created> {
  const response = await api.handle(request('POST', '/characters', { as, body: { name, ancestry: humanAncestryId } }));
  return (await response.json()) as Created;
}

describe('character routes', () => {
  test('create, patch, conflict', async () => {
    const api = app();
    const created = await api.handle(
      request('POST', '/characters', { body: { name: 'Ezren', ancestry: humanAncestryId } }),
    );
    expect(created.status).toBe(200);
    const character = (await created.json()) as { id: string; version: number; ownerId: string; createdAt: string };
    expect(character.version).toBe(1);
    expect(character.ownerId).toBe(amiri);
    expect(character.createdAt).toBe('2026-10-07T10:00:00.000Z');

    const patch = { expectedVersion: 1, patch: { field: 'level', value: 5 } };
    const patched = await api.handle(request('PATCH', `/characters/${character.id}`, { body: patch }));
    expect(((await patched.json()) as { level: number }).level).toBe(5);

    const stale = await api.handle(request('PATCH', `/characters/${character.id}`, { body: patch }));
    expect(stale.status).toBe(409);
    expect(stale.headers.get('content-type')).toContain('application/problem+json');
    expect(((await stale.json()) as Problem).message).toStrictEqual({ key: 'problem.versionConflict' });
  });

  test('invalid body is 422', async () => {
    const response = await app().handle(request('POST', '/characters', { body: { name: '' } }));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.message).toStrictEqual({ key: 'problem.validation' });
    expect(problem.issues).toContainEqual({
      path: ['name'],
      message: { key: 'validation.tooSmall', params: { origin: 'string', minimum: 1 } },
    });
  });
});

describe('character routes without a signed-in user', () => {
  const api = app();
  const id = newId();
  const cases: readonly (readonly [string, Request])[] = [
    ['list', request('GET', '/characters', { as: anonymous })],
    ['get', request('GET', `/characters/${id}`, { as: anonymous })],
    ['create', request('POST', '/characters', { as: anonymous, body: { name: 'Kyra', ancestry: humanAncestryId } })],
    [
      'patch',
      request('PATCH', `/characters/${id}`, {
        as: anonymous,
        body: { expectedVersion: 1, patch: { field: 'level', value: 2 } },
      }),
    ],
    // Authentication comes before decoding: bad input never turns a 401 into a 422.
    ['list with an unknown sort', request('GET', '/characters?sort=password', { as: anonymous })],
    ['get with a malformed id', request('GET', '/characters/not-a-uuid', { as: anonymous })],
    ['create with an empty body', request('POST', '/characters', { as: anonymous, body: {} })],
    ['Pathbuilder import', request('POST', '/characters/import/pathbuilder', { as: anonymous, body: mordredExport })],
  ];

  test.each(cases)('%s is a 401 problem', async (_name, unsigned) => {
    const response = await api.handle(unsigned);
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
    const problem = (await response.json()) as Problem;
    expect(problem.type).toBe('unauthorized');
    expect(problem.message).toStrictEqual({ key: 'problem.unauthorized' });
  });
});

describe('character routes across users', () => {
  test('another user’s character is a 404 to get and to patch, and absent from the list', async () => {
    const api = app();
    const theirs = await create(api, ezren, 'Seelah');
    await create(api, amiri, 'Kyra');

    const got = await api.handle(request('GET', `/characters/${theirs.id}`));
    expect(got.status).toBe(404);
    expect(((await got.json()) as Problem).message).toStrictEqual({ key: 'problem.notFound' });

    const patch = { expectedVersion: 1, patch: { field: 'level', value: 5 } };
    const patched = await api.handle(request('PATCH', `/characters/${theirs.id}`, { body: patch }));
    expect(patched.status).toBe(404);

    const listed = await api.handle(request('GET', '/characters'));
    const names = ((await listed.json()) as { name: string }[]).map((character) => character.name);
    expect(names).toStrictEqual(['Kyra']);
  });
});

describe('character list query', () => {
  test('only enumerated sort options are accepted', async () => {
    const api = app();
    const ok = await api.handle(request('GET', '/characters?sort=name&direction=desc'));
    expect(ok.status).toBe(200);
    const raw = await api.handle(request('GET', '/characters?sort=password'));
    expect(raw.status).toBe(422);
    const filter = await api.handle(request('GET', '/characters?where=1%3D1'));
    expect(filter.status).toBe(422);
  });
});

describe('Pathbuilder import route', () => {
  const path = '/characters/import/pathbuilder';

  test('creates the character and returns it with the import report', async () => {
    const api = app();
    const response = await api.handle(request('POST', path, { body: mordredExport }));
    expect(response.status).toBe(200);
    const { character, report } = (await response.json()) as {
      character: { id: string; name: string; level: number; ownerId: string; version: number };
      report: { unmatched: { kind: string }[]; notCarried: string[] };
    };
    expect(character).toMatchObject({ name: 'Mordred (Dual Class)', level: 12, ownerId: amiri, version: 1 });
    expect(report.unmatched.map((group) => group.kind)).toContain('heritage');
    expect(report.notCarried).toContain('lore');

    const got = await api.handle(request('GET', `/characters/${character.id}`));
    expect(((await got.json()) as { ancestry: string }).ancestry).toBe(humanAncestryId);
  });

  test('an ancestry that is not loaded is a 422 naming it, and nothing is created', async () => {
    const api = app();
    const response = await api.handle(request('POST', path, { body: briarRoseExport }));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues).toStrictEqual([
      {
        path: ['build', 'ancestry'],
        message: { key: 'character.validation.unmatchedAncestry', params: { ancestry: 'Goloma' } },
      },
    ]);
    const listed = await api.handle(request('GET', '/characters'));
    expect(await listed.json()).toStrictEqual([]);
  });

  test.each([
    ['a malformed export', { build: { name: 'Nobody' } }, 'character.import.problem.malformed'],
    ['success: false', { ...mordredExport, success: false }, 'character.import.problem.exportFailed'],
  ])('%s is a 422 with the problem first', async (_name, body, key) => {
    const response = await app().handle(request('POST', path, { body }));
    expect(response.status).toBe(422);
    const problem = (await response.json()) as Problem;
    expect(problem.issues?.[0]).toStrictEqual({ path: [], message: { key } });
  });
});
