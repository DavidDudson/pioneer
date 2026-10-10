import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  AncestryId,
  contentId,
  contentPackId,
  ContentText,
  PackId,
  packContentsFromFiles,
  Slug,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { ContentRepository } from './content-repository';
import { seedContentPacks } from './content-seed';
import { contentPacks } from './content.table';
import { StoredContentSource } from './stored-content-source';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase). Skipped when TEST_DATABASE_URL is unset; CI
 * always sets it. The source serves every official pack, so the tests run in order on one database.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');
const PACK = 'stored-ancestries';

function ancestryEntry(slug: string, name: string): object {
  return {
    id: contentId(PackId.parse(PACK), Slug.parse(slug)),
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

/** A pack of ancestries, as its JSON files would hold it. */
function ancestryPack(ancestries: readonly (readonly [string, string])[]): PackContents {
  const packFile = { id: PACK, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [ancestries.map(([slug, name]) => ancestryEntry(slug, name))]);
}

function ancestryId(slug: string): AncestryId {
  return AncestryId.parse(contentId(PackId.parse(PACK), Slug.parse(slug)));
}

function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async () => contents };
}

describe.skipIf(adminUrl === undefined)('StoredContentSource (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let source: StoredContentSource;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    source = new StoredContentSource(new ContentRepository(database.db));
  });

  afterAll(async () => {
    const problems = await unindexedQueries(database.db, recorder);
    expect(problems).toStrictEqual([]);
    await database.drop();
  });

  async function seed(contents: PackContents): Promise<void> {
    await seedContentPacks(database.db, [loader(contents)], clock);
  }

  test('serves an empty registry before anything is seeded', async () => {
    const registry = await source.registry();

    expect(registry.ancestries()).toStrictEqual([]);
  });

  test('serves the seeded packs, and the same registry while their hashes are unchanged', async () => {
    await seed(ancestryPack([['dwarf', 'Dwarf']]));

    const first = await source.registry();
    const again = await source.registry();

    expect(first.ancestry(ancestryId('dwarf'))?.definition.name).toBe(ContentText.parse('Dwarf'));
    expect(again).toBe(first);
  });

  test('picks up a re-seed on the next ask', async () => {
    const before = await source.registry();
    await seed(
      ancestryPack([
        ['dwarf', 'Dwarf (Remastered)'],
        ['elf', 'Elf'],
      ]),
    );

    const after = await source.registry();

    expect(after).not.toBe(before);
    expect(after.ancestry(ancestryId('dwarf'))?.definition.name).toBe(ContentText.parse('Dwarf (Remastered)'));
    expect(after.ancestry(ancestryId('elf'))).toBeDefined();
  });

  test('concurrent asks share one build', async () => {
    await seed(ancestryPack([['dwarf', 'Dwarf']]));

    const [left, right] = await Promise.all([source.registry(), source.registry()]);

    expect(left).toBe(right);
    expect(left.ancestry(ancestryId('elf'))).toBeUndefined();
  });

  test('a build that fails is not kept, so the next ask tries again', async () => {
    const pack = ancestryPack([
      ['dwarf', 'Dwarf'],
      ['gnome', 'Gnome'],
    ]);
    await seed(pack);
    // A stored pack.json the reader refuses, as a content shape this image cannot read would be.
    const stored = eq(contentPacks.id, contentPackId(pack.file.id));
    await database.db
      .update(contentPacks)
      .set({ data: sql`${contentPacks.data} || '{"unknownField": true}'::jsonb` })
      .where(stored);
    const failed = await source.registry().then(
      () => 'served',
      () => 'refused',
    );
    await database.db.update(contentPacks).set({ data: pack.file }).where(stored);

    const recovered = await source.registry();

    expect(failed).toBe('refused');
    expect(recovered.ancestry(ancestryId('gnome'))).toBeDefined();
  });
});
