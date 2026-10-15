import { describe, expect, test } from 'bun:test';

import { InMemoryPackEnablementDirectory } from '@pioneer/homebrew/application';
import { ContentPackId } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';
import type { Problem } from '@pioneer/shared/kernel';
import type { AnyElysia } from 'elysia';

import {
  amiri,
  anonymous,
  app,
  coreDependency,
  ezren,
  feats,
  makePack,
  playerCore,
  request,
  shareWithAll,
  visibilityPath,
} from './testing/homebrew-route-fixtures';
import type { PackJson } from './testing/homebrew-route-fixtures';

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
      api.handle(request('GET', `/homebrew/packs/${id}/dependencies`, { as: anonymous })),
      api.handle(request('POST', `/homebrew/packs/${id}/dependencies`, { as: anonymous, body: coreDependency })),
      api.handle(request('DELETE', `/homebrew/packs/${id}/dependencies/${playerCore}`, { as: anonymous })),
    ]);
    expect(responses.map(({ status }) => status)).toStrictEqual([401, 401, 401, 401, 401, 401, 401]);
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

    test('a member of a campaign that enables the pack can read it but not change it: 403', async () => {
      const enablement = new InMemoryPackEnablementDirectory();
      const api = app(enablement);
      const pack = await makePack(api);
      await api.handle(request('PATCH', visibilityPath(pack), { body: { visibility: 'campaign' } }));
      enablement.enable(ContentPackId.parse(pack.id), 'Kingmaker', [ezren]);
      const response = await api.handle(
        request('PATCH', visibilityPath(pack), { as: ezren, body: { visibility: 'public' } }),
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

async function statusOf(api: AnyElysia, sent: Request): Promise<number> {
  const response = await api.handle(sent);
  return response.status;
}

async function idsFrom(api: AnyElysia, path: string): Promise<readonly string[]> {
  const response = await api.handle(request('GET', path));
  const packs = (await response.json()) as PackJson[];
  return packs.map(({ id }) => id);
}

describe('archived homebrew pack routes (ADR-0062)', () => {
  test('archive hides the pack, restore brings it back', async () => {
    const api = app();
    const pack = await makePack(api);
    expect(await statusOf(api, request('POST', `/homebrew/packs/${pack.id}/archive`))).toBe(200);
    expect(await statusOf(api, request('GET', `/homebrew/packs/${pack.id}`))).toBe(404);
    expect(await idsFrom(api, '/homebrew/packs')).toStrictEqual([]);
    expect(await idsFrom(api, '/homebrew/packs/archived')).toStrictEqual([pack.id]);
    const patched = request('PATCH', visibilityPath(pack), { body: shareWithAll });
    expect(await statusOf(api, patched)).toBe(404);

    expect(await statusOf(api, request('POST', `/homebrew/packs/${pack.id}/restore`))).toBe(200);
    expect(await statusOf(api, request('GET', `/homebrew/packs/${pack.id}`))).toBe(200);
    expect(await idsFrom(api, '/homebrew/packs/archived')).toStrictEqual([]);
  });

  test('another user’s pack is 404, one they may read is 403, and signed out is 401', async () => {
    const api = app();
    const pack = await makePack(api);
    expect(await statusOf(api, request('POST', `/homebrew/packs/${pack.id}/archive`, { as: ezren }))).toBe(404);
    await api.handle(request('PATCH', visibilityPath(pack), { body: shareWithAll }));
    expect(await statusOf(api, request('POST', `/homebrew/packs/${pack.id}/archive`, { as: ezren }))).toBe(403);
    expect(await statusOf(api, request('POST', `/homebrew/packs/${pack.id}/archive`, { as: anonymous }))).toBe(401);
    expect(await statusOf(api, request('GET', '/homebrew/packs/archived', { as: anonymous }))).toBe(401);
  });
});
