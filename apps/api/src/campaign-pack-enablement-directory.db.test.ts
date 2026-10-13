import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { HomebrewPackService, InMemoryAuthorDirectory } from '@pioneer/homebrew/application';
import { EnablingCampaignName } from '@pioneer/homebrew/domain';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { DrizzleHomebrewPackRepository } from '@pioneer/homebrew/infrastructure';
import { PackVisibility } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-10T10:00:00Z');
const at = clock.now().toString();

describe.skipIf(adminUrl === undefined)('CampaignPackEnablementDirectory (postgres)', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  const seoni = UserId.parse(newId());
  const runelords = newId();
  const kingmaker = newId();
  const unrelated = newId();
  let database: TestDatabase;
  let directory: CampaignPackEnablementDirectory;
  let pack: HomebrewPack;

  interface CampaignSeed {
    readonly id: string;
    readonly name: string;
    readonly gm: UserId;
    readonly players: readonly UserId[];
  }

  async function insertCampaign({ id, name, gm, players }: CampaignSeed): Promise<void> {
    await database.db.execute(
      sql`insert into campaigns (id, version, name, gm_id, created_at) values (${id}, 1, ${name}, ${gm}, ${at})`,
    );
    const members = [[gm, 'gm'] as const, ...players.map((player) => [player, 'player'] as const)];
    await Promise.all(
      members.map(async ([user, role]) =>
        database.db.execute(
          sql`insert into campaign_members (id, campaign_id, user_id, role, joined_at) values (${newId()}, ${id}, ${user}, ${role}, ${at})`,
        ),
      ),
    );
  }

  async function enable(campaignId: string): Promise<void> {
    await database.db.execute(
      sql`insert into campaign_packs (id, campaign_id, pack_id, enabled_at) values (${newId()}, ${campaignId}, ${pack.id}, ${at})`,
    );
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await Promise.all(
      [amiri, ezren, seoni].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    directory = new CampaignPackEnablementDirectory(database.db);
    pack = new HomebrewPackBuilder().slug('amiri-feats').ownedBy(amiri).build();
    await new DrizzleHomebrewPackRepository(database.db).insert(pack);
    await insertCampaign({ id: runelords, name: 'Rise of the Runelords', gm: ezren, players: [seoni] });
    await insertCampaign({ id: kingmaker, name: 'Kingmaker', gm: seoni, players: [] });
    await insertCampaign({ id: unrelated, name: 'Abomination Vaults', gm: amiri, players: [] });
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a pack no campaign enables has no campaigns and no readers', async () => {
    expect(await directory.campaignsEnabling(pack)).toStrictEqual([]);
    expect(await directory.belongsToCampaignEnabling(ezren, pack)).toBe(false);
  });

  test('names the campaigns that enable the pack, alphabetically, and only those', async () => {
    await enable(runelords);
    await enable(kingmaker);
    expect(await directory.campaignsEnabling(pack)).toStrictEqual([
      EnablingCampaignName.parse('Kingmaker'),
      EnablingCampaignName.parse('Rise of the Runelords'),
    ]);
  });

  test('members of an enabling campaign belong to one, whatever their role; others do not', async () => {
    expect(await directory.belongsToCampaignEnabling(ezren, pack)).toBe(true);
    expect(await directory.belongsToCampaignEnabling(seoni, pack)).toBe(true);
    expect(await directory.belongsToCampaignEnabling(amiri, pack)).toBe(false);
  });

  test('the service refuses private while campaigns enable the pack, naming them, and allows it after they let go', async () => {
    const service = new HomebrewPackService(
      {
        packs: new DrizzleHomebrewPackRepository(database.db),
        authors: new InMemoryAuthorDirectory(),
        enablement: directory,
      },
      clock,
    );
    await service.setVisibility(amiri, pack.id, PackVisibility.Campaign);
    const error = await rejection(service.setVisibility(amiri, pack.id, PackVisibility.Private));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor.params).toStrictEqual({
      campaigns: 'Kingmaker, Rise of the Runelords',
    });
    const stillShared = await service.get(amiri, pack.id);
    expect(stillShared.visibility).toBe(PackVisibility.Campaign);

    await database.db.execute(sql`delete from campaign_packs where pack_id = ${pack.id}`);
    const madePrivate = await service.setVisibility(amiri, pack.id, PackVisibility.Private);
    expect(madePrivate.visibility).toBe(PackVisibility.Private);
  });

  test('every lookup is served by an index', async () => {
    await directory.campaignsEnabling(pack);
    await directory.belongsToCampaignEnabling(ezren, pack);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
