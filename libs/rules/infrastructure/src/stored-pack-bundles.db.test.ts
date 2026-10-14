import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { contentPackId, packContentsFromFiles, PackId } from '@pioneer/rules/sdk';
import type { ContentPackId, PackContents, PackContentsLoader } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, inArray, sql } from 'drizzle-orm';

import { ContentRepository } from './content-repository';
import { seedContentPacks } from './content-seed';
import { contentPackDeps, contentPacks } from './content.table';
import { StoredPackBundles } from './stored-pack-bundles';

/** Uses the disposable TEST_DATABASE_URL; skipped without it, and CI always sets it. */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-14T10:00:00Z');
const OWNER = UserId.parse(newId());
const ELVES = 'bundled-elves';
const KOBOLDS = 'bundled-kobolds';
const OFFICIAL = 'bundled-official';

function pack(slug: string): PackContents {
  return packContentsFromFiles({ id: slug, title: slug, publisher: 'Pioneer', license: 'homebrew' }, []);
}

function idOf(slug: string): ContentPackId {
  return contentPackId(PackId.parse(slug));
}

describe.skipIf(adminUrl === undefined)('StoredPackBundles (postgres)', () => {
  let database: TestDatabase;
  let bundles: StoredPackBundles;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    const at = clock.now().toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${OWNER}, 'Owner', false, ${at}, ${at})`,
    );
    const contents = [pack(ELVES), pack(KOBOLDS), pack(OFFICIAL)];
    await seedContentPacks(
      database.db,
      contents.map((each): PackContentsLoader => ({ id: each.file.id, load: async () => each })),
      clock,
    );
    // Seeded as official packs, then given to the owner, which is what makes the first two homebrew.
    await database.db
      .update(contentPacks)
      .set({ ownerId: OWNER, visibility: 'private' })
      .where(inArray(contentPacks.id, [idOf(ELVES), idOf(KOBOLDS)]));
    await database.db.insert(contentPackDeps).values({ id: newId(), packId: idOf(KOBOLDS), dependsOn: idOf(ELVES) });
    bundles = new StoredPackBundles(new ContentRepository(database.db));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('bundles the packs asked for and the packs they extend, each after what it extends', async () => {
    const built = await bundles.of([idOf(KOBOLDS)]);

    expect(built.manifest.packs.map((each) => String(each.id))).toStrictEqual([ELVES, KOBOLDS]);
  });

  test('shares the bundles for the same set while its packs are unchanged, and builds again when one changes', async () => {
    const first = await bundles.of([idOf(KOBOLDS), idOf(KOBOLDS)]);
    const again = await bundles.of([idOf(KOBOLDS)]);
    await database.db
      .update(contentPacks)
      .set({ contentHash: 'edited' })
      .where(eq(contentPacks.id, idOf(ELVES)));
    const edited = await bundles.of([idOf(KOBOLDS)]);

    expect(again).toBe(first);
    expect(edited).not.toBe(first);
  });

  test('bundles no official pack, and nothing for a pack that does not exist', async () => {
    const built = await bundles.of([idOf(OFFICIAL), idOf('bundled-nowhere')]);

    expect(built.manifest.packs).toStrictEqual([]);
  });
});
