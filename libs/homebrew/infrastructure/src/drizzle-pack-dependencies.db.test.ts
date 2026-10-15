import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { HomebrewPackService, InMemoryAuthorDirectory, PackDependencyService } from '@pioneer/homebrew/application';
import type { PackEnablementDirectory } from '@pioneer/homebrew/application';
import { UsingEntryName } from '@pioneer/homebrew/domain';
import { fixtureOwnerId, HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { contentEntries, seedContentPacks } from '@pioneer/rules/infrastructure';
import {
  ContentId,
  contentId,
  ContentText,
  contentPackId,
  EntrySlug,
  PackId,
  packContentsFromFiles,
  PackVisibility,
} from '@pioneer/rules/sdk';
import type { ContentPackId, PackContents, PackContentsLoader, PackDependencyEdge } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId } from '@pioneer/shared/kernel';
import type { UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DrizzleDependencyUsageDirectory } from './drizzle-dependency-usage-directory';
import { DrizzleHomebrewPackRepository } from './drizzle-homebrew-pack-repository';
import { DrizzlePackDependencyRepository } from './drizzle-pack-dependency-repository';
import { DrizzlePackDirectory } from './drizzle-pack-directory';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-10T10:00:00Z');
const OFFICIAL = PackId.parse('dep-official');
const official = contentPackId(OFFICIAL);
const USAGE_PACK = PackId.parse('dep-usage');

/** No campaign enables anything: these tests are about the graph. */
const noEnablement: PackEnablementDirectory = {
  campaignsEnabling: async () => [],
  belongsToCampaignEnabling: async () => false,
};

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const now = clock.now().toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Owner', false, ${now}, ${now})`,
  );
}

/** Whether another transaction is refused the row's lock right now, as it is while a change holds it. */
async function lockedAgainstOthers(database: TestDatabase, id: ContentPackId): Promise<boolean> {
  const probe = sql`select id from content_packs where id = ${id} for update nowait`;
  return database.db
    .transaction(async (tx) => tx.execute(probe))
    .then(
      () => false,
      () => true,
    );
}

/** The reasons of the settled promises that were rejected. */
function reasons(outcomes: readonly PromiseSettledResult<unknown>[]): readonly unknown[] {
  const rejected = outcomes.filter((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
  return rejected.map((outcome): unknown => outcome.reason);
}

interface EntryInput {
  readonly pack: ContentPackId;
  readonly slug: EntrySlug;
  readonly name: string;
  readonly data: object;
}

/** A trait entry row, written directly: only its `data` matters to what is tested. */
function entryRow({ pack, slug, name, data }: EntryInput): typeof contentEntries.$inferInsert {
  return {
    id: ContentId.parse(contentId(pack === official ? OFFICIAL : USAGE_PACK, slug)),
    packId: pack,
    kind: 'trait',
    slug,
    name: ContentText.parse(name),
    rarity: 'common',
    traits: [],
    data: data as typeof contentEntries.$inferInsert.data,
    updatedAt: clock.now().toString(),
  };
}

describe.skipIf(adminUrl === undefined)('pack dependencies (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let packs: DrizzleHomebrewPackRepository;
  let directory: DrizzlePackDirectory;
  let dependencies: DrizzlePackDependencyRepository;
  let usage: DrizzleDependencyUsageDirectory;
  let homebrew: HomebrewPackService;
  let service: PackDependencyService;

  /** A stored private pack. */
  async function pack(slug: string): Promise<ContentPackId> {
    const built = new HomebrewPackBuilder().slug(slug).build();
    await packs.insert(built);
    return built.id;
  }

  /** The dependencies stored for one pack. */
  async function edgesOf(id: ContentPackId): Promise<readonly PackDependencyEdge[]> {
    const edges = await dependencies.edges();
    return edges.filter((edge) => edge.pack === id);
  }

  async function connect(edge: PackDependencyEdge): Promise<void> {
    await dependencies.add(fixtureOwnerId, edge, async () => {});
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    packs = new DrizzleHomebrewPackRepository(database.db);
    directory = new DrizzlePackDirectory(database.db);
    dependencies = new DrizzlePackDependencyRepository(database.db);
    usage = new DrizzleDependencyUsageDirectory(database.db);
    const authors = new InMemoryAuthorDirectory().name(fixtureOwnerId, 'Owner');
    homebrew = new HomebrewPackService({ packs, authors, enablement: noEnablement, directory, dependencies }, clock);
    service = new PackDependencyService({ packs, directory, dependencies, usage, enablement: noEnablement });
    await insertUser(database, fixtureOwnerId);
    const file = { id: OFFICIAL, title: 'Dep Official', publisher: 'Pioneer', license: 'ORC' };
    const contents = packContentsFromFiles(file, []);
    const loader: PackContentsLoader = { id: contents.file.id, load: async (): Promise<PackContents> => contents };
    await seedContentPacks(database.db, [loader], clock);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('add stores a dependency once, and edges and dependentsOf read it back', async () => {
    const mine = await pack('dep-add');
    await connect({ pack: mine, dependsOn: official });
    await connect({ pack: mine, dependsOn: official });
    const stored = await edgesOf(mine);
    const dependents = await dependencies.dependentsOf(official);
    expect(stored).toStrictEqual([{ pack: mine, dependsOn: official }]);
    expect(dependents).toContain(mine);
  });

  test('remove deletes the dependency, and is harmless when it is not there', async () => {
    const mine = await pack('dep-remove');
    await connect({ pack: mine, dependsOn: official });
    await dependencies.remove(fixtureOwnerId, { pack: mine, dependsOn: official });
    await dependencies.remove(fixtureOwnerId, { pack: mine, dependsOn: official });
    expect(await edgesOf(mine)).toStrictEqual([]);
  });

  test('a dependency on a pack that does not exist is refused by the foreign key', async () => {
    const mine = await pack('dep-fk');
    const missing = contentPackId(PackId.parse('dep-never-inserted'));
    const failure = await rejection(connect({ pack: mine, dependsOn: missing }));
    expect(failure).toBeInstanceOf(Error);
    expect(await edgesOf(mine)).toStrictEqual([]);
  });

  test('a pack cannot be deleted, so its dependencies stay; archiving it leaves them as they are', async () => {
    const base = await pack('dep-base');
    const extension = await pack('dep-extension');
    await connect({ pack: extension, dependsOn: base });
    const blocked = await rejection(database.db.execute(sql`delete from content_packs where id = ${base}`));
    expect(blocked).toBeInstanceOf(Error);
    const extensionDeleted = await rejection(
      database.db.execute(sql`delete from content_packs where id = ${extension}`),
    );
    expect(extensionDeleted).toBeInstanceOf(Error);
    await database.db.execute(sql`update content_packs set archived_at = now() where id = ${extension}`);
    expect(await edgesOf(extension)).toStrictEqual([{ pack: extension, dependsOn: base }]);
  });

  test('add holds both packs locked while it checks, and stores nothing if the check throws', async () => {
    const mine = await pack('dep-lock');
    const refusal = new Error('refused');
    const locked: boolean[] = [];
    const outcome = dependencies.add(fixtureOwnerId, { pack: mine, dependsOn: official }, async () => {
      locked.push(...(await Promise.all([mine, official].map(async (id) => lockedAgainstOthers(database, id)))));
      throw refusal;
    });
    expect(await rejection(outcome)).toBe(refusal);
    expect(locked).toStrictEqual([true, true]);
    expect(await edgesOf(mine)).toStrictEqual([]);
  });

  test('two additions that would close a cycle together: one wins, the other is a 409', async () => {
    const first = await pack('dep-cycle-first');
    const second = await pack('dep-cycle-second');
    const outcomes = await Promise.allSettled([
      service.add(fixtureOwnerId, first, { dependsOn: second }),
      service.add(fixtureOwnerId, second, { dependsOn: first }),
    ]);
    const refused = reasons(outcomes);
    const stored = [...(await edgesOf(first)), ...(await edgesOf(second))];
    expect(refused).toHaveLength(1);
    expect(refused).toSatisfy((all: readonly unknown[]) => all.every((reason) => reason instanceof ConflictError));
    expect(stored).toHaveLength(1);
  });

  test('a pack going private and another made to depend on it as public: exactly one succeeds', async () => {
    const base = new HomebrewPackBuilder().slug('dep-race-base').visibleTo(PackVisibility.Public).build();
    const extension = new HomebrewPackBuilder().slug('dep-race-extension').visibleTo(PackVisibility.Public).build();
    await packs.insert(base);
    await packs.insert(extension);
    const outcomes = await Promise.allSettled([
      homebrew.setVisibility(fixtureOwnerId, base.id, PackVisibility.Private),
      service.add(fixtureOwnerId, extension.id, { dependsOn: base.id }),
    ]);
    const refused = reasons(outcomes);
    expect(refused).toHaveLength(1);
    expect(refused).toSatisfy((all: readonly unknown[]) => all.every((reason) => reason instanceof ConflictError));
  });

  test('the directory finds official and homebrew packs, and lists all of them by title', async () => {
    const mine = await pack('dep-directory');
    const foundOfficial = await directory.findById(official);
    const foundMine = await directory.findById(mine);
    const foundNowhere = await directory.findById(contentPackId(PackId.parse('dep-nowhere')));
    const all = await directory.all();
    const ids = all.map(({ id }) => id);
    const titles = all.map(({ summary }) => summary.title);
    expect(foundOfficial).toMatchObject({
      ownerId: undefined,
      visibility: PackVisibility.Public,
      summary: { official: true, title: 'Dep Official' },
    });
    expect(foundMine).toMatchObject({ ownerId: fixtureOwnerId, summary: { official: false } });
    expect(foundNowhere).toBeUndefined();
    expect(ids).toContain(official);
    expect(ids).toContain(mine);
    expect(titles).toStrictEqual(titles.toSorted((left, right) => left.localeCompare(right)));
  });

  test('entriesUsing names the entries that mention an entry of the dependency, and only those', async () => {
    const mine = await pack('dep-usage');
    const agile = EntrySlug.parse('trait:dep-agile');
    const taken = contentId(OFFICIAL, agile);
    await database.db.insert(contentEntries).values([
      entryRow({ pack: official, slug: agile, name: 'Agile', data: { id: taken } }),
      entryRow({
        pack: mine,
        slug: EntrySlug.parse('trait:dep-uses'),
        name: 'Uses it',
        data: { nested: [{ trait: taken.toUpperCase() }] },
      }),
      entryRow({
        pack: mine,
        slug: EntrySlug.parse('trait:dep-alone'),
        name: 'Stands alone',
        data: { text: 'no reference', other: newId() },
      }),
    ]);
    const using = await usage.entriesUsing(mine, official);
    const none = await usage.entriesUsing(mine, mine);
    expect(using).toStrictEqual([UsingEntryName.parse('Uses it')]);
    expect(none).toStrictEqual([]);
  });

  test('every lookup is served by an index', async () => {
    await dependencies.edges();
    await dependencies.dependentsOf(official);
    await directory.findById(official);
    await directory.all();
    await usage.entriesUsing(official, official);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
