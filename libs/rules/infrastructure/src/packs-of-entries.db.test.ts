import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { ContentId, contentId, contentPackId, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, inArray, sql } from 'drizzle-orm';

import { ContentRepository } from './content-repository';
import { seedContentPacks } from './content-seed';
import { contentPacks } from './content.table';

/** Runs against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset, as CI always sets it. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-11T10:00:00Z');
const OWNER = UserId.parse(newId());
const OFFICIAL = 'held-official';
const BREW = 'held-brew';
const ARCHIVED = 'held-archived';
const brew = contentPackId(PackId.parse(BREW));
const archived = contentPackId(PackId.parse(ARCHIVED));

function entryId(pack: string, slug: string): ContentId {
  return ContentId.parse(contentId(PackId.parse(pack), EntrySlug.parse(`ancestry:${slug}`)));
}

function ancestryPack(pack: string, slug: string): PackContents {
  const file = { id: pack, title: 'Test Pack', publisher: 'Pioneer', license: 'homebrew' };
  const entry = {
    id: entryId(pack, slug),
    pack,
    kind: 'ancestry',
    slug: `ancestry:${slug}`,
    name: slug,
    rarity: 'common',
    traits: [slug],
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
  return packContentsFromFiles(file, [[entry]]);
}

function loader(contents: PackContents): PackContentsLoader {
  return { id: contents.file.id, load: async () => contents };
}

describe.skipIf(adminUrl === undefined)('ContentRepository.homebrewPacksOfEntries (postgres)', () => {
  let database: TestDatabase;
  let repository: ContentRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    repository = new ContentRepository(database.db);
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${OWNER}, 'Owner', false, ${at}, ${at})`,
    );
    await seedContentPacks(
      database.db,
      [
        loader(ancestryPack(OFFICIAL, 'dwarf')),
        loader(ancestryPack(BREW, 'kobold')),
        loader(ancestryPack(ARCHIVED, 'gone')),
      ],
      clock,
    );
    const owned = inArray(contentPacks.id, [brew, archived]);
    await database.db.update(contentPacks).set({ ownerId: OWNER, visibility: 'private' }).where(owned);
    await database.db.update(contentPacks).set({ archivedAt: at }).where(eq(contentPacks.id, archived));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('finds the homebrew pack that defines an entry, once', async () => {
    const found = await repository.homebrewPacksOfEntries([entryId(BREW, 'kobold'), entryId(BREW, 'kobold')]);

    expect(found).toStrictEqual([brew]);
  });

  test('leaves out official packs, archived packs and ids that are no entry', async () => {
    const found = await repository.homebrewPacksOfEntries([
      entryId(OFFICIAL, 'dwarf'),
      entryId(ARCHIVED, 'gone'),
      entryId(BREW, 'nobody'),
    ]);

    expect(found).toStrictEqual([]);
    expect(await repository.homebrewPacksOfEntries([])).toStrictEqual([]);
  });
});
