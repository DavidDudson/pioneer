import { describe, expect, test } from 'bun:test';

import {
  HomebrewPackService,
  InMemoryAuthorDirectory,
  InMemoryHomebrewPackRepository,
} from '@pioneer/homebrew/application';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { homebrewRoutes } from './homebrew-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

function app(): AnyElysia {
  const service = new HomebrewPackService(
    {
      packs: new InMemoryHomebrewPackRepository(),
      authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
    },
    fixedClock('2026-10-10T10:00:00Z'),
  );
  return new Elysia().use(problemHandler).use(homebrewRoutes(service, new FakeAuthenticator()));
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

interface PackJson {
  readonly id: string;
  readonly slug: string;
  readonly ownerId: string;
  readonly visibility: string;
  readonly entryCount: number;
}

const feats = { title: 'Amiri feats', slug: 'amiri-feats' };

describe('homebrew routes', () => {
  test('create, then get and list it', async () => {
    const api = app();
    const created = await api.handle(request('POST', '/homebrew/packs', { body: feats }));
    expect(created.status).toBe(200);
    const pack = (await created.json()) as PackJson;
    expect(pack).toMatchObject({ slug: 'amiri-feats', ownerId: amiri, visibility: 'private', entryCount: 0 });

    const got = await api.handle(request('GET', `/homebrew/packs/${pack.id}`));
    expect(((await got.json()) as PackJson).id).toBe(pack.id);
    const listed = await api.handle(request('GET', '/homebrew/packs'));
    expect(((await listed.json()) as PackJson[]).map(({ id }) => id)).toStrictEqual([pack.id]);
  });

  test('a slug in use is 409', async () => {
    const api = app();
    await api.handle(request('POST', '/homebrew/packs', { body: feats }));
    const response = await api.handle(request('POST', '/homebrew/packs', { as: ezren, body: feats }));
    expect(response.status).toBe(409);
    expect(((await response.json()) as Problem).message).toStrictEqual({ key: 'homebrew.pack.slugTaken' });
  });

  test('another user’s pack is 404', async () => {
    const api = app();
    const created = await api.handle(request('POST', '/homebrew/packs', { body: feats }));
    const pack = (await created.json()) as PackJson;
    const response = await api.handle(request('GET', `/homebrew/packs/${pack.id}`, { as: ezren }));
    expect(response.status).toBe(404);
  });

  test('a bad slug is 422', async () => {
    const response = await app().handle(
      request('POST', '/homebrew/packs', { body: { title: 'Amiri feats', slug: 'Not A Slug' } }),
    );
    expect(response.status).toBe(422);
  });

  test('every route needs a signed-in user', async () => {
    const api = app();
    const id = newId();
    const responses = await Promise.all([
      api.handle(request('GET', '/homebrew/packs', { as: anonymous })),
      api.handle(request('GET', `/homebrew/packs/${id}`, { as: anonymous })),
      api.handle(request('POST', '/homebrew/packs', { as: anonymous, body: feats })),
    ]);
    expect(responses.map(({ status }) => status)).toStrictEqual([401, 401, 401]);
  });
});
