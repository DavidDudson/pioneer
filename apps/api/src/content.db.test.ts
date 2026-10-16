import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  BUNDLE_CACHE_CONTROL,
  contentPacks,
  HOMEBREW_SEARCH_CACHE_CONTROL,
  MANIFEST_CACHE_CONTROL,
  SEARCH_CACHE_CONTROL,
  seedContentPacks,
} from '@pioneer/rules/infrastructure';
import {
  AncestryId,
  BundleFile,
  ContentId,
  contentId,
  contentPackId,
  descriptionShard,
  ContentManifest,
  EntrySlug,
  packContentsFromFiles,
  PackId,
} from '@pioneer/rules/sdk';
import type { KindBundles, PackBundles, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, UserId } from '@pioneer/shared/kernel';
import { problemHandler } from '@pioneer/shared/server';
import { actingAs, createTestDatabase, FakeAuthenticator, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';
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

function ancestryEntry(slug: string, name: string, description: readonly object[] = []): object {
  return {
    id: contentId(PACK, EntrySlug.parse(`ancestry:${slug}`)),
    pack: PACK,
    kind: 'ancestry',
    slug: `ancestry:${slug}`,
    name,
    rarity: 'common',
    traits: [slug, 'humanoid'],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description,
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

function ancestryPack(name: string, description: readonly object[] = []): PackContents {
  const packFile = { id: PACK, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [[ancestryEntry('dwarf', name, description)]]);
}

function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async (): Promise<PackContents> => contents };
}

describe.skipIf(adminUrl === undefined)('content routes (postgres)', () => {
  let database: TestDatabase;
  let api: AnyElysia;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    api = new Elysia().use(problemHandler).use(content(database.db, new FakeAuthenticator()));
  });

  afterAll(async () => {
    await database.drop();
  });

  async function request(path: string, headers: Record<string, string> = {}): Promise<Response> {
    return api.handle(new Request(`http://localhost${path}`, { headers }));
  }

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
      [
        pack.file,
        ...pack.kinds.flatMap((kind) => [kind.mechanics, kind.names, ...kind.descriptions.map(({ file }) => file)]),
      ].map((file) => `${pack.id}/${file}`),
    );
    const responses = await Promise.all(files.map(async (file) => api.handle(get(`/content/bundles/${file}`))));

    expect(packs.map((pack) => String(pack.id))).toStrictEqual([
      'battlecry',
      'character-guide',
      'cheliax-infernal-inheritance',
      'core-rules',
      'dark-archive-remastered',
      'divine-mysteries',
      'draconic-codex',
      'gm-core',
      'guns-and-gears',
      'hellfire-dispatches',
      'high-seas',
      'howl-of-the-wild',
      'impossible-lands',
      'impossible-magic',
      'monster-core',
      'mwangi-expanse',
      'player-core',
      'player-core-2',
      'rage-of-elements',
      'rival-academies',
      'secrets-of-magic',
      'shining-kingdoms',
      'tian-xia-character-guide',
      'treasure-vault',
      'war-of-immortals',
    ]);
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

    const dwarf = AncestryId.parse(contentId(PACK, EntrySlug.parse('ancestry:dwarf')));
    const entries = (await mechanicsResponse.json()) as readonly object[];
    expect(entries).toHaveLength(1);
    expect(entries[0]).not.toHaveProperty('name');
    expect(entries[0]).not.toHaveProperty('description');
    expect(await namesResponse.json()).toStrictEqual({ [dwarf]: { name: 'Dwarf' } });
  });

  test('a kind’s descriptions are served by shard, from the stored texts', async () => {
    const text = [{ type: 'paragraph', content: [{ type: 'text', text: 'Stout folk of the deep.' }] }];
    await seedContentPacks(database.db, [loader(ancestryPack('Dwarf', text))], clock);
    const { descriptions } = await ancestries();
    const dwarf = AncestryId.parse(contentId(PACK, EntrySlug.parse('ancestry:dwarf')));

    expect(descriptions.map(({ shard }) => shard)).toStrictEqual([descriptionShard(ContentId.parse(dwarf))]);
    const [shard] = descriptions;
    const response = await api.handle(get(`/content/bundles/${PACK}/${shard?.file}`));

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(BUNDLE_CACHE_CONTROL);
    expect(await response.json()).toStrictEqual({ [dwarf]: text });
    const kind = await ancestries();
    const mechanics = await api.handle(get(`/content/bundles/${PACK}/${kind.mechanics}`));
    expect(JSON.stringify(await mechanics.json())).not.toContain('Stout folk');
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

  describe('search', () => {
    const OWNER = UserId.parse('2f6d1c44-5b0e-4c52-8f43-0b7a9d2e1a10');
    const DWARF = contentId(PACK, EntrySlug.parse('ancestry:dwarf'));
    const folk = [{ type: 'paragraph', content: [{ type: 'text', text: 'Zorbolith folk of the deep.' }] }];

    test('official entries are found by their words, publicly and briefly cached', async () => {
      await seedContentPacks(database.db, [loader(ancestryPack('Dwarf', folk))], clock);

      const response = await request('/content/search?query=zorbolith');

      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toBe(SEARCH_CACHE_CONTROL);
      expect(await response.json()).toStrictEqual({ ids: [DWARF], total: 1 });
    });

    test('kinds and paging narrow the answer', async () => {
      const wrongKind = await request('/content/search?query=zorbolith&kinds=spell,feat');
      const rightKind = await request('/content/search?query=zorbolith&kinds=ancestry');
      const past = await request('/content/search?query=zorbolith&limit=1&offset=1');

      expect(await wrongKind.json()).toStrictEqual({ ids: [], total: 0 });
      expect(await rightKind.json()).toStrictEqual({ ids: [DWARF], total: 1 });
      expect(await past.json()).toStrictEqual({ ids: [], total: 1 });
    });

    test('a search without words, or with a kind that does not exist, is refused', async () => {
      const empty = await request('/content/search?query=%20');
      const missing = await request('/content/search');
      const unknown = await request('/content/search?query=zorbolith&kinds=dragon');

      expect([empty.status, missing.status, unknown.status]).toStrictEqual([422, 422, 422]);
    });

    test('a homebrew pack is searched only by someone who may read it, and the answer is never shared', async () => {
      await database.db.execute(
        sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${OWNER}, 'Owner', false, ${clock.now().toString()}, ${clock.now().toString()})`,
      );
      await database.db
        .update(contentPacks)
        .set({ ownerId: OWNER, visibility: 'private' })
        .where(eq(contentPacks.slug, PACK));
      const named = `/content/search?query=zorbolith&packs=${contentPackId(PACK)}`;

      const unnamed = await request('/content/search?query=zorbolith');
      const anonymous = await request(named);
      const owner = await request(named, actingAs(OWNER));
      const stranger = await request(named, actingAs(UserId.parse('b1e0a6f2-93c4-4a8e-8d6b-3f1c2e7d4a55')));

      expect(await unnamed.json()).toStrictEqual({ ids: [], total: 0 });
      expect(await anonymous.json()).toStrictEqual({ ids: [], total: 0 });
      expect(anonymous.headers.get('cache-control')).toBe(HOMEBREW_SEARCH_CACHE_CONTROL);
      expect(await owner.json()).toStrictEqual({ ids: [DWARF], total: 1 });
      expect(owner.headers.get('cache-control')).toBe(HOMEBREW_SEARCH_CACHE_CONTROL);
      expect(await stranger.json()).toStrictEqual({ ids: [], total: 0 });
    });
  });
});
