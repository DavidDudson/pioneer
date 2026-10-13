import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CampaignPackService } from '@pioneer/campaign/application';
import { CampaignPackId, EnabledPackId } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignPack } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignPackRepository, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import { HomebrewPackService, InMemoryAuthorDirectory, PackAccessPolicy } from '@pioneer/homebrew/application';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import {
  DrizzleHomebrewPackRepository,
  DrizzlePackDependencyRepository,
  DrizzlePackDirectory,
} from '@pioneer/homebrew/infrastructure';
import { PackVisibility } from '@pioneer/rules/sdk';
import { ConflictError, fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-10T10:00:00Z');
const at = clock.now().toString();

describe.skipIf(adminUrl === undefined)('CampaignPackService over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let packs: DrizzleHomebrewPackRepository;
  let homebrew: HomebrewPackService;
  let repository: DrizzleCampaignPackRepository;
  let service: CampaignPackService;
  let spells: HomebrewPack;
  let feats: HomebrewPack;
  let foreign: HomebrewPack;
  let campaignId: CampaignId;

  /** The stored rows, as the repository reads them back. */
  async function stored(): Promise<readonly CampaignPack[]> {
    return repository.listForCampaign(campaignId);
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    await Promise.all(
      [amiri, ezren].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    const campaigns = new DrizzleCampaignRepository(database.db);
    const campaign = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
    campaignId = campaign.id;
    packs = new DrizzleHomebrewPackRepository(database.db);
    spells = new HomebrewPackBuilder()
      .slug('amiri-spells')
      .titled('Spells')
      .ownedBy(amiri)
      .visibleTo(PackVisibility.Campaign)
      .build();
    feats = new HomebrewPackBuilder()
      .slug('amiri-feats')
      .titled('Feats')
      .ownedBy(amiri)
      .visibleTo(PackVisibility.Campaign)
      .build();
    foreign = new HomebrewPackBuilder()
      .slug('ezren-items')
      .titled('Items')
      .ownedBy(ezren)
      .visibleTo(PackVisibility.Private)
      .build();
    await Promise.all([spells, feats, foreign].map(async (pack) => packs.insert(pack)));
    const dependencies = new DrizzlePackDependencyRepository(database.db);
    const directory = new DrizzlePackDirectory(database.db);
    const enablement = new CampaignPackEnablementDirectory(database.db);
    await database.db.execute(
      sql`insert into content_pack_deps (id, pack_id, depends_on) values (${newId()}, ${feats.id}, ${spells.id})`,
    );
    homebrew = new HomebrewPackService(
      { packs, authors: new InMemoryAuthorDirectory(), enablement, directory, dependencies },
      clock,
    );
    repository = new DrizzleCampaignPackRepository(database.db);
    service = new CampaignPackService(
      {
        campaigns,
        packs: repository,
        catalog: new HomebrewPackCatalog(directory, dependencies, new PackAccessPolicy(enablement)),
      },
      clock,
    );
  });

  beforeEach(async () => {
    await database.db.execute(sql`delete from campaign_packs where campaign_id = ${campaignId}`);
    await database.db.execute(
      sql`update content_packs set visibility = 'campaign' where id in (${spells.id}, ${feats.id})`,
    );
  });

  afterAll(async () => {
    await database.drop();
  });

  test('enables a pack with the packs it extends, recording who did it', async () => {
    const enabled = await service.enable(amiri, campaignId, { packId: EnabledPackId.parse(feats.id) });
    expect(enabled.enabled.map((pack) => String(pack.title))).toStrictEqual(['Feats', 'Spells']);
    const rows = await stored();
    expect(rows.map((row) => row.enabledBy)).toStrictEqual([amiri, amiri]);
  });

  test('enabling twice stores each pack once', async () => {
    await service.enable(amiri, campaignId, { packId: EnabledPackId.parse(feats.id) });
    await service.enable(amiri, campaignId, { packId: EnabledPackId.parse(spells.id) });
    const rows = await stored();
    expect(rows).toHaveLength(2);
  });

  test('refuses a pack the GM may not read', async () => {
    const error = await rejection(service.enable(amiri, campaignId, { packId: EnabledPackId.parse(foreign.id) }));
    expect(error).toBeInstanceOf(NotFoundError);
  });

  test('a visibility change waits for an enablement holding the pack, then sees the campaign', async () => {
    const held = Promise.withResolvers<undefined>();
    const lockTaken = Promise.withResolvers<undefined>();
    const row: CampaignPack = {
      id: CampaignPackId.parse(newId()),
      packId: EnabledPackId.parse(feats.id),
      enabledBy: amiri,
      enabledAt: clock.now(),
    };
    const enabling = repository.enable(amiri, { campaignId, packs: [row] }, async () => {
      lockTaken.resolve(undefined);
      await held.promise;
    });
    await lockTaken.promise;
    const going = homebrew.setVisibility(amiri, feats.id, PackVisibility.Private);
    const outcome = await Promise.race([
      going.then(
        () => 'finished',
        () => 'finished',
      ),
      Bun.sleep(150).then(() => 'waiting'),
    ]);
    expect(outcome).toBe('waiting');
    held.resolve(undefined);
    await enabling;
    expect(await rejection(going)).toBeInstanceOf(ConflictError);
    const current = await homebrew.get(amiri, feats.id);
    expect(current.visibility).toBe(PackVisibility.Campaign);
  });

  test('disabling stops the campaign using the pack and frees it to go private', async () => {
    await service.enable(amiri, campaignId, { packId: EnabledPackId.parse(feats.id) });
    await service.disable(amiri, campaignId, EnabledPackId.parse(feats.id));
    const madePrivate = await homebrew.setVisibility(amiri, feats.id, PackVisibility.Private);
    expect(madePrivate.visibility).toBe(PackVisibility.Private);
  });

  test('every lookup is served by an index', async () => {
    await service.enable(amiri, campaignId, { packId: EnabledPackId.parse(spells.id) });
    await service.packs(amiri, campaignId);
    await service.disable(amiri, campaignId, EnabledPackId.parse(spells.id));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  test('deleting the campaign, the pack or the user who enabled it', async () => {
    await service.enable(amiri, campaignId, { packId: EnabledPackId.parse(feats.id) });
    await database.db.execute(sql`delete from content_packs where id = ${feats.id}`);
    const afterPack = await stored();
    expect(afterPack.map((row) => row.packId)).toStrictEqual([spells.id]);

    const stranger = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${stranger}, 'User', false, ${at}, ${at})`,
    );
    await database.db.execute(sql`update campaign_packs set enabled_by = ${stranger}`);
    await database.db.execute(sql`delete from users where id = ${stranger}`);
    const afterUser = await stored();
    expect(afterUser[0]?.enabledBy).toBeUndefined();

    await database.db.execute(sql`delete from campaigns where id = ${campaignId}`);
    expect(await stored()).toStrictEqual([]);
  });
});
