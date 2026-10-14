import { describe, expect, test } from 'bun:test';

import {
  HomebrewBundleService,
  InMemoryHomebrewPackRepository,
  InMemoryPackBundleSource,
  InMemoryPackDirectory,
  InMemoryPackEnablementDirectory,
  PackAccessPolicy,
} from '@pioneer/homebrew/application';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { ContentManifest, PackVisibility } from '@pioneer/rules/sdk';
import { newId, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, FakeAuthenticator } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import {
  HOMEBREW_BUNDLE_CACHE_CONTROL,
  HOMEBREW_MANIFEST_CACHE_CONTROL,
  homebrewBundleRoutes,
} from './homebrew-bundle-routes';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());

interface Fixture {
  readonly api: AnyElysia;
  readonly pack: HomebrewPack;
}

async function appWith(): Promise<Fixture> {
  const pack = new HomebrewPackBuilder().slug('table-rules').ownedBy(amiri).visibleTo(PackVisibility.Campaign).build();
  const packs = new InMemoryHomebrewPackRepository();
  await packs.insert(pack);
  const service = new HomebrewBundleService({
    directory: new InMemoryPackDirectory(packs),
    access: new PackAccessPolicy(new InMemoryPackEnablementDirectory().enable(pack.id, 'The Table', [ezren])),
    bundles: new InMemoryPackBundleSource([pack]),
  });
  const api = new Elysia().use(problemHandler).use(homebrewBundleRoutes(service, new FakeAuthenticator()));
  return { api, pack };
}

function post(as: UserId | undefined, packs: readonly string[]): Request {
  return new Request('http://localhost/content/homebrew/manifest', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(as === undefined ? {} : actingAs(as)) },
    body: JSON.stringify({ packs }),
  });
}

function get(as: UserId | undefined, path: string): Request {
  return new Request(`http://localhost${path}`, { headers: as === undefined ? {} : actingAs(as) });
}

describe('homebrew bundle routes', () => {
  test('every route needs a signed-in user', async () => {
    const { api, pack } = await appWith();

    const responses = await Promise.all([
      api.handle(post(undefined, [pack.id])),
      api.handle(get(undefined, '/content/homebrew/bundles/table-rules/pack.0000000000000000.json')),
    ]);

    expect(responses.map(({ status }) => status)).toStrictEqual([401, 401]);
  });

  test('a member reads the manifest and the bundle it names, both private to their browser', async () => {
    const { api, pack } = await appWith();

    const manifestResponse = await api.handle(post(ezren, [pack.id]));
    const manifest = ContentManifest.parse(await manifestResponse.json());
    const [listed] = manifest.packs;
    const bundleResponse = await api.handle(get(ezren, `/content/homebrew/bundles/table-rules/${listed?.file}`));

    expect(manifestResponse.status).toBe(200);
    expect(manifestResponse.headers.get('cache-control')).toBe(HOMEBREW_MANIFEST_CACHE_CONTROL);
    expect(String(listed?.id)).toBe('table-rules');
    expect(bundleResponse.status).toBe(200);
    expect(bundleResponse.headers.get('cache-control')).toBe(HOMEBREW_BUNDLE_CACHE_CONTROL);
  });

  test('a stranger gets an empty manifest, and a 404 for the bundle', async () => {
    const { api, pack } = await appWith();
    const owners = await api.handle(post(amiri, [pack.id]));
    const [listed] = ContentManifest.parse(await owners.json()).packs;

    const manifestResponse = await api.handle(post(stranger, [pack.id]));
    const bundleResponse = await api.handle(get(stranger, `/content/homebrew/bundles/table-rules/${listed?.file}`));

    expect(ContentManifest.parse(await manifestResponse.json()).packs).toStrictEqual([]);
    expect(bundleResponse.status).toBe(404);
  });
});
