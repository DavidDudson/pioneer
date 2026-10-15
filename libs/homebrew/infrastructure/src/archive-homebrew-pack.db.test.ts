import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { HomebrewCommand } from '@pioneer/homebrew/domain';
import { fixtureOwnerId, HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { contentPacks } from '@pioneer/rules/infrastructure';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { DrizzleHomebrewPackRepository } from './drizzle-homebrew-pack-repository';
import { DrizzlePackDirectory } from './drizzle-pack-directory';

/** Archived homebrew packs (ADR-0062). Runs against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-15T08:00:00Z').now();
const archiving = { actor: fixtureOwnerId, command: HomebrewCommand.ArchivePack } as const;
const restoring = { actor: fixtureOwnerId, command: HomebrewCommand.RestorePack } as const;

describe.skipIf(adminUrl === undefined)('archived homebrew packs (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let repository: DrizzleHomebrewPackRepository;
  let directory: DrizzlePackDirectory;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleHomebrewPackRepository(database.db);
    directory = new DrizzlePackDirectory(database.db);
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureOwnerId}, 'Owner', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an archived pack is missing from reads, lists and the directory, and found as archived', async () => {
    const feats = new HomebrewPackBuilder().slug('archived-feats').build();
    await repository.insert(feats);
    await repository.archive(feats.id, NOW, { audit: archiving });
    expect(await repository.findById(feats.id)).toBeUndefined();
    expect(await directory.findById(feats.id)).toBeUndefined();
    const everyone = await directory.all();
    expect(everyone.map((pack) => pack.id)).not.toContain(feats.id);
    const live = await repository.listOwnedBy(fixtureOwnerId);
    expect(live.map((pack) => pack.id)).not.toContain(feats.id);
    const archived = await repository.listArchivedOwnedBy(fixtureOwnerId);
    expect(archived.map((pack) => pack.id)).toContain(feats.id);
    expect(await repository.findArchivedById(feats.id)).toStrictEqual(feats);
  });

  test('restoring brings it back with its version and time untouched', async () => {
    const spells = new HomebrewPackBuilder().slug('restored-spells').build();
    await repository.insert(spells);
    await repository.archive(spells.id, NOW, { audit: archiving });
    await repository.archive(spells.id, NOW, { audit: archiving });
    await repository.restore(spells.id, { audit: restoring });
    expect(await repository.findArchivedById(spells.id)).toBeUndefined();
    expect(await repository.findById(spells.id)).toStrictEqual(spells);
    const listed = await directory.findById(spells.id);
    expect(listed?.id).toBe(spells.id);
  });

  test('the check runs with the pack locked, and a throw stores nothing', async () => {
    const items = new HomebrewPackBuilder().slug('refused-items').build();
    await repository.insert(items);
    const refusal = new Error('refused');
    const outcome = repository.archive(items.id, NOW, {
      audit: archiving,
      whileLocked: async () => {
        throw refusal;
      },
    });
    expect(await rejection(outcome)).toBe(refusal);
    expect(await repository.findById(items.id)).toStrictEqual(items);
  });

  test('an archive and a restore take turns, so a live pack never extends an archived one', async () => {
    const first = new HomebrewPackBuilder().slug('turn-first').build();
    const second = new HomebrewPackBuilder().slug('turn-second').build();
    await repository.insert(first);
    await repository.insert(second);
    await repository.archive(second.id, NOW, { audit: archiving });
    const gate = Promise.withResolvers<undefined>();
    let secondChecked = false;
    const archiveFirst = repository.archive(first.id, NOW, {
      audit: archiving,
      whileLocked: async () => {
        await gate.promise;
      },
    });
    await Bun.sleep(100);
    const restoreSecond = repository.restore(second.id, {
      audit: restoring,
      whileLocked: async () => {
        secondChecked = true;
      },
    });
    await Bun.sleep(200);
    expect(secondChecked).toBe(false);
    gate.resolve(undefined);
    await Promise.all([archiveFirst, restoreSecond]);
    expect(secondChecked).toBe(true);
  });

  test('an archived pack takes no visibility change', async () => {
    const rules = new HomebrewPackBuilder().slug('frozen-rules').build();
    await repository.insert(rules);
    await repository.archive(rules.id, NOW, { audit: archiving });
    expect(await repository.updateVisibility(rules)).toBeUndefined();
  });

  test('archive and restore are audited by name', async () => {
    const lore = new HomebrewPackBuilder().slug('audited-lore').build();
    await repository.insert(lore);
    await repository.archive(lore.id, NOW, { audit: archiving });
    await repository.restore(lore.id, { audit: restoring });
    const rows = await database.db.execute(
      sql`select command from audit.log where table_name = 'content_packs' and row_id = ${lore.id} and action = 'update' order by changed_at`,
    );
    expect(rows.map((row) => String(row['command']))).toStrictEqual([
      HomebrewCommand.ArchivePack,
      HomebrewCommand.RestorePack,
    ]);
  });

  test('archiving stamps archived_at', async () => {
    const maps = new HomebrewPackBuilder().slug('stamped-maps').build();
    await repository.insert(maps);
    await repository.archive(maps.id, NOW, { audit: archiving });
    const [row] = await database.db
      .select({ archivedAt: contentPacks.archivedAt })
      .from(contentPacks)
      .where(eq(contentPacks.id, maps.id));
    expect(row?.archivedAt).not.toBeNull();
  });

  test('a pack row cannot be deleted', async () => {
    const gear = new HomebrewPackBuilder().slug('kept-gear').build();
    await repository.insert(gear);
    const refused = await rejection(database.db.execute(sql`delete from content_packs where id = ${gear.id}`));
    expect(refused).toBeInstanceOf(Error);
    expect(await repository.findById(gear.id)).toBeDefined();
  });

  test('an owner with packs cannot be deleted', async () => {
    const owner = UserId.parse(newId());
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${owner}, 'Gone', false, ${at}, ${at})`,
    );
    await repository.insert(new HomebrewPackBuilder().slug('orphan-pack').ownedBy(owner).build());
    const refused = await rejection(database.db.execute(sql`delete from users where id = ${owner}`));
    expect(refused).toBeInstanceOf(Error);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
