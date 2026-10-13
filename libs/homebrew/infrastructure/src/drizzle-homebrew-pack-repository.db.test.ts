import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { fixtureOwnerId, HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { seedContentPacks } from '@pioneer/rules/infrastructure';
import { ContentText, contentPackId, PackId, packContentsFromFiles } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DrizzleHomebrewPackRepository } from './drizzle-homebrew-pack-repository';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-10T10:00:00Z');

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const now = clock.now().toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${now}, ${now})`,
  );
}

describe.skipIf(adminUrl === undefined)('DrizzleHomebrewPackRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleHomebrewPackRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleHomebrewPackRepository(database.db);
    await Promise.all([fixtureOwnerId, ezren].map(async (id) => insertUser(database, id)));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('insert stores the pack and finds it again, owned and private', async () => {
    const pack = new HomebrewPackBuilder().slug('amiri-feats').build();
    expect(await repository.insert(pack)).toStrictEqual(pack);
    expect(await repository.findById(pack.id)).toStrictEqual(pack);
  });

  test('a slug in use is refused, and the first pack stays as it was', async () => {
    const first = new HomebrewPackBuilder().slug('shared-slug').titled('First').build();
    const second = new HomebrewPackBuilder().slug('shared-slug').titled('Second').ownedBy(ezren).build();
    await repository.insert(first);
    expect(await repository.insert(second)).toBeUndefined();
    const stored = await repository.findById(first.id);
    expect(stored?.title).toBe(ContentText.parse('First'));
  });

  test('an official pack’s slug is refused and the pack is never read as homebrew', async () => {
    const file = { id: 'official-pack', title: 'Official', publisher: 'Pioneer', license: 'ORC' };
    const contents = packContentsFromFiles(file, []);
    const loader: PackContentsLoader = { id: contents.file.id, load: async (): Promise<PackContents> => contents };
    await seedContentPacks(database.db, [loader], clock);
    const clash = new HomebrewPackBuilder().slug('official-pack').build();
    expect(await repository.insert(clash)).toBeUndefined();
    const official = contentPackId(PackId.parse('official-pack'));
    expect(await repository.findById(official)).toBeUndefined();
  });

  test('list returns only the owner’s packs, newest first', async () => {
    const older = new HomebrewPackBuilder().slug('list-older').ownedBy(ezren).build();
    const newer = new HomebrewPackBuilder()
      .slug('list-newer')
      .ownedBy(ezren)
      .updatedAt(clock.now().add({ minutes: 1 }))
      .build();
    await repository.insert(older);
    await repository.insert(newer);
    const owned = await repository.listOwnedBy(ezren);
    expect(owned.map(({ slug }) => slug)).toStrictEqual([PackId.parse('list-newer'), PackId.parse('list-older')]);
  });

  test('every lookup is served by an index', async () => {
    await repository.listOwnedBy(ezren);
    await repository.findById(contentPackId(PackId.parse('amiri-feats')));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
