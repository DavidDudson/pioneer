import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import {
  AncestryId,
  contentId,
  contentPackId,
  ContentText,
  EntrySlug,
  packContentsFromFiles,
  PackId,
} from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, newId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { ContentRepository } from './content-repository';
import { seedContentPacks } from './content-seed';
import { contentPackDeps, contentPacks } from './content.table';
import { StoredContentSource } from './stored-content-source';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase). Skipped when TEST_DATABASE_URL is unset; CI
 * always sets it. The source serves every official pack, so the tests run in order on one database.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');
const PACK = 'stored-ancestries';

function ancestryEntry(slug: string, name: string, pack: string = PACK): object {
  return {
    id: contentId(PackId.parse(pack), EntrySlug.parse(`ancestry:${slug}`)),
    pack,
    kind: 'ancestry',
    slug: `ancestry:${slug}`,
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
function ancestryPack(ancestries: readonly (readonly [string, string])[], pack: string = PACK): PackContents {
  const packFile = { id: pack, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(packFile, [ancestries.map(([slug, name]) => ancestryEntry(slug, name, pack))]);
}

function ancestryId(slug: string, pack: string = PACK): AncestryId {
  return AncestryId.parse(contentId(PackId.parse(pack), EntrySlug.parse(`ancestry:${slug}`)));
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
    try {
      const problems = await unindexedQueries(database.db, recorder);
      expect(problems).toStrictEqual([]);
    } finally {
      await database.drop();
    }
  });

  async function seed(contents: PackContents): Promise<void> {
    await seedContentPacks(database.db, [loader(contents)], clock);
  }

  function repository(): ContentRepository {
    return new ContentRepository(database.db);
  }

  /** `pack` extends `dependsOn`. */
  async function depend(pack: string, dependsOn: string): Promise<void> {
    await database.db.insert(contentPackDeps).values({
      id: newId(),
      packId: contentPackId(PackId.parse(pack)),
      dependsOn: contentPackId(PackId.parse(dependsOn)),
    });
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

  describe('with dependencies', () => {
    const BASE = 'stored-base';
    const MIDDLE = 'stored-middle';
    const TOP = 'stored-top';
    test('loads a pack after every pack it extends, through any number of packs', async () => {
      // Seeded top first, so the order comes from the dependencies and not from when each was stored.
      await seed(ancestryPack([['top', 'Top']], TOP));
      await seed(ancestryPack([['middle', 'Middle']], MIDDLE));
      await seed(ancestryPack([['base', 'Base']], BASE));
      await depend(TOP, MIDDLE);
      await depend(MIDDLE, BASE);

      const loaded = await repository().loadWithDependencies(contentPackId(PackId.parse(TOP)));

      expect(loaded.map(({ file }) => file.id)).toStrictEqual([
        PackId.parse(BASE),
        PackId.parse(MIDDLE),
        PackId.parse(TOP),
      ]);
    });

    test('registers them, so the pack and what it extends are all in the registry', async () => {
      const registry = await source.registryWithDependencies(contentPackId(PackId.parse(TOP)));

      expect(registry.ancestry(ancestryId('top', TOP))).toBeDefined();
      expect(registry.ancestry(ancestryId('middle', MIDDLE))).toBeDefined();
      expect(registry.ancestry(ancestryId('base', BASE))).toBeDefined();
    });

    test('leaves out packs the root does not extend', async () => {
      const registry = await source.registryWithDependencies(contentPackId(PackId.parse(MIDDLE)));

      expect(registry.ancestry(ancestryId('base', BASE))).toBeDefined();
      expect(registry.ancestry(ancestryId('top', TOP))).toBeUndefined();
    });

    test('a pack that does not exist loads nothing', async () => {
      const registry = await source.registryWithDependencies(contentPackId(PackId.parse('stored-nowhere')));

      expect(registry.ancestries()).toStrictEqual([]);
    });
  });
});
