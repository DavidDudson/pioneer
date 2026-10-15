import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { AncestryId, contentId, contentPackId, EntrySlug, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { PackContents } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { ContentRepository } from './content-repository';
import { seedContentPacks } from './content-seed';
import { contentPacks } from './content.table';
import { StoredContentSource } from './stored-content-source';

/** An archived homebrew pack is out of force (ADR-0062). Runs against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-15T10:00:00Z');
const PACK = 'archived-brew-elves';
const pack = contentPackId(PackId.parse(PACK));
const slug = EntrySlug.parse('ancestry:elf');

/** A one-ancestry pack, as its JSON files would hold it. */
function elfPack(): PackContents {
  const entry = {
    id: contentId(PackId.parse(PACK), slug),
    pack: PACK,
    kind: 'ancestry',
    slug,
    name: 'Brew Elf',
    rarity: 'common',
    traits: ['elf', 'humanoid'],
    sources: [{ kind: 'book', book: 'player-core', page: 42 }],
    description: [],
    rules: [],
    data: {
      hitPoints: 6,
      size: 'medium',
      speed: 30,
      boosts: [['dex'], ['str', 'dex', 'con', 'int', 'wis', 'cha']],
      flaws: [],
      languages: [],
      additionalLanguages: { count: 0, options: [] },
      reach: 5,
    },
  };
  const file = { id: PACK, title: 'Brew Elves', publisher: 'Pioneer', license: 'homebrew' };
  return packContentsFromFiles(file, [[entry]]);
}

describe.skipIf(adminUrl === undefined)('archived homebrew packs in the stored content (postgres)', () => {
  const owner = UserId.parse(newId());
  let database: TestDatabase;
  let repository: ContentRepository;
  let source: StoredContentSource;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', new QueryRecorder());
    repository = new ContentRepository(database.db);
    source = new StoredContentSource(repository);
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${owner}, 'Owner', false, ${at}, ${at})`,
    );
    const contents = elfPack();
    await seedContentPacks(
      database.db,
      [{ id: contents.file.id, load: async (): Promise<PackContents> => contents }],
      clock,
    );
    await database.db
      .update(contentPacks)
      .set({ ownerId: owner, visibility: 'private' })
      .where(eq(contentPacks.id, pack));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('is served while live, then not hashed, loaded or registered once archived, though its row stays', async () => {
    const elf = AncestryId.parse(contentId(PackId.parse(PACK), slug));
    expect(await repository.homebrewHashes([pack])).toHaveLength(1);
    expect(await repository.loadHomebrew([pack])).toHaveLength(1);
    expect(await repository.loadWithDependencies(pack)).toHaveLength(1);
    const live = await source.registry([pack]);
    expect(live.ancestry(elf)).toBeDefined();

    await database.db.update(contentPacks).set({ archivedAt: clock.now().toString() }).where(eq(contentPacks.id, pack));

    expect(await repository.homebrewHashes([pack])).toStrictEqual([]);
    expect(await repository.loadHomebrew([pack])).toStrictEqual([]);
    expect(await repository.loadWithDependencies(pack)).toStrictEqual([]);
    const archived = await source.registry([pack]);
    expect(archived.ancestry(elf)).toBeUndefined();
    const rows = await database.db.select({ id: contentPacks.id }).from(contentPacks).where(eq(contentPacks.id, pack));
    expect(rows).toHaveLength(1);
  });
});
