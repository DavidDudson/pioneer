import { describe, expect, test } from 'bun:test';

import {
  HomebrewPackService,
  InMemoryAuthorDirectory,
  InMemoryHomebrewPackRepository,
  InMemoryPackEnablementDirectory,
} from '@pioneer/homebrew/application';
import { ContentPackId } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { homebrewRoutes } from './homebrew-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

function app(enablement = new InMemoryPackEnablementDirectory()): AnyElysia {
  const service = new HomebrewPackService(
    {
      packs: new InMemoryHomebrewPackRepository(),
      authors: new InMemoryAuthorDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren'),
      enablement,
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
const shareWithAll = { visibility: 'public' };

async function makePack(api: AnyElysia): Promise<PackJson> {
  const response = await api.handle(request('POST', '/homebrew/packs', { body: feats }));
  return (await response.json()) as PackJson;
}

const visibilityPath = (pack: PackJson): string => `/homebrew/packs/${pack.id}/visibility`;

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
      api.handle(request('PATCH', `/homebrew/packs/${id}/visibility`, { as: anonymous, body: shareWithAll })),
    ]);
    expect(responses.map(({ status }) => status)).toStrictEqual([401, 401, 401, 401]);
  });

  describe('PATCH /homebrew/packs/:id/visibility', () => {
    test('the owner changes it, and a stranger then reads the pack', async () => {
      const api = app();
      const pack = await makePack(api);
      const changed = await api.handle(request('PATCH', visibilityPath(pack), { body: shareWithAll }));
      expect(changed.status).toBe(200);
      expect(((await changed.json()) as PackJson).visibility).toBe('public');
      const read = await api.handle(request('GET', `/homebrew/packs/${pack.id}`, { as: ezren }));
      expect(read.status).toBe(200);
    });

    test('someone who can read the pack but does not own it is 403', async () => {
      const api = app();
      const pack = await makePack(api);
      await api.handle(request('PATCH', visibilityPath(pack), { body: shareWithAll }));
      const response = await api.handle(
        request('PATCH', visibilityPath(pack), {
          as: ezren,
          body: { visibility: 'private' },
        }),
      );
      expect(response.status).toBe(403);
    });

    test('someone who cannot read the pack, and a missing pack, are both 404', async () => {
      const api = app();
      const pack = await makePack(api);
      const hidden = await api.handle(
        request('PATCH', visibilityPath(pack), {
          as: ezren,
          body: shareWithAll,
        }),
      );
      const unknown = ContentPackId.parse(newId());
      const missing = await api.handle(
        request('PATCH', `/homebrew/packs/${unknown}/visibility`, { body: shareWithAll }),
      );
      expect([hidden.status, missing.status]).toStrictEqual([404, 404]);
    });

    test('private while a campaign enables the pack is 409, naming the campaign', async () => {
      const enablement = new InMemoryPackEnablementDirectory();
      const api = app(enablement);
      const pack = await makePack(api);
      await api.handle(
        request('PATCH', visibilityPath(pack), {
          body: { visibility: 'campaign' },
        }),
      );
      enablement.enable(ContentPackId.parse(pack.id), 'Kingmaker', [ezren]);
      const response = await api.handle(
        request('PATCH', visibilityPath(pack), {
          body: { visibility: 'private' },
        }),
      );
      expect(response.status).toBe(409);
      expect(((await response.json()) as Problem).message).toStrictEqual({
        key: 'homebrew.pack.campaignsEnableIt',
        params: { campaigns: 'Kingmaker' },
      });
    });

    test('an unknown visibility is 422', async () => {
      const api = app();
      const pack = await makePack(api);
      const response = await api.handle(
        request('PATCH', visibilityPath(pack), {
          body: { visibility: 'everyone' },
        }),
      );
      expect(response.status).toBe(422);
    });
  });
});
