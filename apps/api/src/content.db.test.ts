import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { BUNDLE_CACHE_CONTROL, MANIFEST_CACHE_CONTROL, seedContentPacks } from '@pioneer/rules/infrastructure';
import {
  AncestryId,
  BundleFile,
  contentId,
  ContentManifest,
  PackId,
  packContentsFromFiles,
  Slug,
} from '@pioneer/rules/sdk';
import type { KindBundles, PackBundles, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { Elysia } from 'elysia';
import type { AnyElysia } from 'elysia';

import { content, seedOfficialContent } from './content';

/**
 * The content routes as the composition root wires them, against a throwaway Postgres database (see
 * createTestDatabase). Skipped when TEST_DATABASE_URL is unset; CI always sets it. The tests run in order on one
 * database. No request is signed in: official content is public (ADR-0007).
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');
const PACK = PackId.parse('stored-ancestries');

function get(path: string): Request {
  return new Request(`http://localhost${path}`);
}

function ignore(): void {
  // Seed log lines are not under test.
}

function ancestryEntry(slug: string, name: string): object {
  return {
    id: contentId(PACK, Slug.parse(slug)),
    pack: PACK,
    kind: 'ancestry',
    slug,
    name,
    rarity: 'common',
    traits: [slug, 'humanoid'],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: [],
    rules: [],
    data: {
      hitPoints: 10,
      size: 'medium',
      speed: 25,
      boosts: [['str'], ['str', 'dex', 'con', 'int', 'wis', 'cha']],
      flaws: [],
      languages: [],
      additionalLanguages: { count: 0, options: [] },
      reach: 5,
    },
  };
}

function ancestryPack(name: string): PackContents {
  const packFile = { id: PACK, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [[ancestryEntry('dwarf', name)]]);
}

function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async (): Promise<PackContents> => contents };
}

describe.skipIf(adminUrl === undefined)('content routes (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    api = new Elysia().use(problemHandler).use(content(database.db));
  });

  afterAll(async () => {
    await database.drop();
  });

  async function manifest(): Promise<ContentManifest> {
    const response = await api.handle(get('/content/manifest'));
    expect(response.status).toBe(200);
    return ContentManifest.parse(await response.json());
  }

  async function packIn(id: PackId): Promise<PackBundles> {
    const { packs } = await manifest();
    const found = packs.find((pack) => pack.id === id);
    if (found === undefined) {
      throw new Error(`Expected ${id} in the manifest`);
    }
    return found;
  }

  async function ancestries(): Promise<KindBundles> {
    const pack = await packIn(PACK);
    const found = pack.kinds.find((kind) => kind.kind === 'ancestry');
    if (found === undefined) {
      throw new Error('Expected ancestries in the manifest');
    }
    return found;
  }

  test('the manifest is empty before anything is seeded, and short-lived', async () => {
    const response = await api.handle(get('/content/manifest'));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(MANIFEST_CACHE_CONTROL);
    expect(await response.json()).toStrictEqual({ packs: [] });
  });

  test('every official pack is served as bundles, each immutable', async () => {
    await seedOfficialContent(database.db, clock, ignore);

    const { packs } = await manifest();
    const files = packs.flatMap((pack) =>
      [pack.file, ...pack.kinds.flatMap((kind) => [kind.mechanics, kind.names])].map((file) => `${pack.id}/${file}`),
    );
    const responses = await Promise.all(files.map(async (file) => api.handle(get(`/content/bundles/${file}`))));

    expect(packs.map((pack) => String(pack.id))).toStrictEqual(['core-rules', 'monster-core', 'player-core']);
    expect(responses.map((response) => response.status)).toStrictEqual(files.map(() => 200));
    expect(responses.map((response) => response.headers.get('cache-control'))).toStrictEqual(
      files.map(() => BUNDLE_CACHE_CONTROL),
    );
  });

  test('a kind’s mechanics leave out names, which its names bundle holds', async () => {
    await seedContentPacks(database.db, [loader(ancestryPack('Dwarf'))], clock);
    const { mechanics, names } = await ancestries();

    const mechanicsResponse = await api.handle(get(`/content/bundles/${PACK}/${mechanics}`));
    const namesResponse = await api.handle(get(`/content/bundles/${PACK}/${names}`));

    const dwarf = AncestryId.parse(contentId(PACK, Slug.parse('dwarf')));
    const entries = (await mechanicsResponse.json()) as readonly object[];
    expect(entries).toHaveLength(1);
    expect(entries[0]).not.toHaveProperty('name');
    expect(entries[0]).not.toHaveProperty('description');
    expect(await namesResponse.json()).toStrictEqual({ [dwarf]: { name: 'Dwarf' } });
  });

  test('a re-seed is served on the next request, and the old bundle is a 404 no one caches', async () => {
    const before = await ancestries();
    await seedContentPacks(database.db, [loader(ancestryPack('Dwarf (Remastered)'))], clock);

    const after = await ancestries();
    const stale = await api.handle(get(`/content/bundles/${PACK}/${before.names}`));
    const current = await api.handle(get(`/content/bundles/${PACK}/${after.names}`));

    expect(after.names).not.toBe(before.names);
    expect(after.mechanics).toBe(before.mechanics);
    expect(stale.status).toBe(404);
    expect(stale.headers.get('cache-control')).not.toBe(BUNDLE_CACHE_CONTROL);
    expect(current.status).toBe(200);
  });

  test('a file that was never current is a 404', async () => {
    const unknown = BundleFile.parse('ancestry.mech.0000000000000000.json');

    const response = await api.handle(get(`/content/bundles/${PACK}/${unknown}`));

    expect(response.status).toBe(404);
  });

  test('a file name that is not a bundle is refused', async () => {
    const response = await api.handle(get(`/content/bundles/${PACK}/..%2Fsecrets.json`));

    expect(response.status).toBe(422);
  });
});
