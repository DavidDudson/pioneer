import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignCommand } from '@pioneer/campaign/domain';
import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { fixedClock, newId, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { eq, sql } from 'drizzle-orm';

import { campaigns } from './campaign.table';
import { DrizzleCampaignRepository } from './drizzle-campaign-repository';

/** Archived campaigns (ADR-0062). Runs against a throwaway Postgres database; skipped when TEST_DATABASE_URL is unset. */
const adminUrl = testDatabaseUrl();
const NOW = fixedClock('2026-10-15T08:00:00Z').now();
const archiving = { actor: fixtureGmId, command: CampaignCommand.ArchiveCampaign } as const;
const restoring = { actor: fixtureGmId, command: CampaignCommand.RestoreCampaign } as const;

describe.skipIf(adminUrl === undefined)('archived campaigns (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let repository: DrizzleCampaignRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCampaignRepository(database.db);
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${fixtureGmId}, 'GM', false, ${at}, ${at})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an archived campaign is missing from reads and lists, and found as archived', async () => {
    const tomb = await repository.insert(new CampaignBuilder().named('Sky King’s Tomb').build());
    await repository.archive(tomb.id, NOW, archiving);
    expect(await repository.findById(tomb.id)).toBeUndefined();
    const live = await repository.listForMember(fixtureGmId);
    expect(live.map((campaign) => campaign.id)).not.toContain(tomb.id);
    const archived = await repository.listArchivedForGm(fixtureGmId);
    expect(archived.map((campaign) => campaign.id)).toContain(tomb.id);
    const found = await repository.findArchivedById(tomb.id);
    expect(found?.version).toBe(tomb.version);
    expect(found?.members).toStrictEqual(tomb.members);
  });

  test('restoring brings it back with its version and members untouched', async () => {
    const lords = await repository.insert(new CampaignBuilder().named('Blood Lords').build());
    await repository.archive(lords.id, NOW, archiving);
    await repository.archive(lords.id, NOW, archiving);
    await repository.restore(lords.id, restoring);
    expect(await repository.findArchivedById(lords.id)).toBeUndefined();
    expect(await repository.findById(lords.id)).toStrictEqual(lords);
  });

  test('an archived campaign takes no membership change', async () => {
    const ghosts = await repository.insert(new CampaignBuilder().named('Season of Ghosts').build());
    await repository.archive(ghosts.id, NOW, archiving);
    const error = await rejection(repository.updateMembers(ghosts, ghosts.version));
    expect(error).toBeInstanceOf(VersionConflictError);
  });

  test('archive and restore are audited by name', async () => {
    const rust = await repository.insert(new CampaignBuilder().named('Rusthenge').build());
    await repository.archive(rust.id, NOW, archiving);
    await repository.restore(rust.id, restoring);
    const rows = await database.db.execute(
      sql`select command from audit.log where table_name = 'campaigns' and row_id = ${rust.id} and action = 'update' order by changed_at`,
    );
    expect(rows.map((row) => String(row['command']))).toStrictEqual([
      CampaignCommand.ArchiveCampaign,
      CampaignCommand.RestoreCampaign,
    ]);
  });

  test('archiving stamps archived_at', async () => {
    const crown = await repository.insert(new CampaignBuilder().named('Crown of Fangs').build());
    await repository.archive(crown.id, NOW, archiving);
    const [row] = await database.db
      .select({ archivedAt: campaigns.archivedAt })
      .from(campaigns)
      .where(eq(campaigns.id, crown.id));
    expect(row?.archivedAt).not.toBeNull();
  });

  test('a campaign row cannot be deleted', async () => {
    const kingmaker = await repository.insert(new CampaignBuilder().named('Kingmaker').build());
    const refused = await rejection(database.db.execute(sql`delete from campaigns where id = ${kingmaker.id}`));
    expect(refused).toBeInstanceOf(Error);
    expect(await repository.findById(kingmaker.id)).toBeDefined();
  });

  test('a GM with campaigns cannot be deleted', async () => {
    const gm = UserId.parse(newId());
    const at = NOW.toString();
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${gm}, 'Gone', false, ${at}, ${at})`,
    );
    await repository.insert(new CampaignBuilder().named('Strength of Thousands').ranBy(gm).build());
    const refused = await rejection(database.db.execute(sql`delete from users where id = ${gm}`));
    expect(refused).toBeInstanceOf(Error);
  });

  test('every query the repository issued is served by an index', async () => {
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
