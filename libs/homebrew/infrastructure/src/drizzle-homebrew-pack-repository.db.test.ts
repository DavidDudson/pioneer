import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { fixtureOwnerId, HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { seedContentPacks } from '@pioneer/rules/infrastructure';
import { ContentText, contentPackId, PackId, packContentsFromFiles, PackVisibility } from '@pioneer/rules/sdk';
import type { PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
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

  test('updateVisibility stores the visibility and time, and nothing else', async () => {
    const pack = new HomebrewPackBuilder().slug('visibility-change').build();
    await repository.insert(pack);
    const shared = pack.withVisibility(PackVisibility.Campaign, pack.updatedAt.add({ minutes: 1 }));
    expect(await repository.updateVisibility(shared)).toStrictEqual(shared);
    expect(await repository.findById(pack.id)).toStrictEqual(shared);
  });

  test('updateVisibility finds no pack that does not exist', async () => {
    const missing = new HomebrewPackBuilder().slug('never-inserted').build();
    expect(
      await repository.updateVisibility(missing.withVisibility(PackVisibility.Public, missing.updatedAt)),
    ).toBeUndefined();
  });

  test('updateVisibility leaves an official pack public', async () => {
    const official = contentPackId(PackId.parse('official-pack'));
    const claim = new HomebrewPackBuilder().slug('official-pack').build();
    expect(
      await repository.updateVisibility(claim.withVisibility(PackVisibility.Private, claim.updatedAt)),
    ).toBeUndefined();
    const stored = await database.db.execute(sql`select visibility from content_packs where id = ${official}`);
    expect(stored[0]).toMatchObject({ visibility: PackVisibility.Public });
  });

  test('updateVisibility holds the pack locked while it checks, and stores nothing if the check throws', async () => {
    const pack = new HomebrewPackBuilder().slug('visibility-lock').build();
    await repository.insert(pack);
    const shared = pack.withVisibility(PackVisibility.Campaign, pack.updatedAt.add({ minutes: 1 }));
    const refusal = new Error('refused');
    let lockedWhileChecking = false;
    const outcome = repository.updateVisibility(shared, async () => {
      const probe = sql`select id from content_packs where id = ${pack.id} for update nowait`;
      lockedWhileChecking = await database.db
        .transaction(async (tx) => tx.execute(probe))
        .then(
          () => false,
          () => true,
        );
      throw refusal;
    });
    expect(await rejection(outcome)).toBe(refusal);
    expect(lockedWhileChecking).toBe(true);
    expect(await repository.findById(pack.id)).toStrictEqual(pack);
  });

  test('every lookup is served by an index', async () => {
    await repository.listOwnedBy(ezren);
    await repository.findById(contentPackId(PackId.parse('amiri-feats')));
    await repository.updateVisibility(new HomebrewPackBuilder().slug('amiri-feats').build());
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
