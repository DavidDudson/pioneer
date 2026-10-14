import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CampaignPackId } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMemberId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignPackRepository, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import { CharacterPackService } from '@pioneer/character/application';
import { CharacterCommand, PackAuthority } from '@pioneer/character/domain';
import type { CharacterId, CharacterPack } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterPackRepository, DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { PackAccessPolicy } from '@pioneer/homebrew/application';
import type { HomebrewPack } from '@pioneer/homebrew/domain';
import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import {
  DrizzleHomebrewPackRepository,
  DrizzlePackDependencyRepository,
  DrizzlePackDirectory,
} from '@pioneer/homebrew/infrastructure';
import { ContentPackId, PackVisibility } from '@pioneer/rules/sdk';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';
import { CampaignPackEnablementDirectory } from './campaign-pack-enablement-directory';
import { HomebrewPackCatalog } from './homebrew-pack-catalog';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-14T10:00:00Z');
const at = clock.now().toString();

describe.skipIf(adminUrl === undefined)('CharacterPackService over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCharacterPackRepository;
  let campaignPacks: DrizzleCampaignPackRepository;
  let service: CharacterPackService;
  let spells: HomebrewPack;
  let feats: HomebrewPack;
  let items: HomebrewPack;
  let kyra: CharacterId;
  let campaignId: CampaignId;
  let memberId: CampaignMemberId;

  /** The stored rows, as the repository reads them back. */
  async function stored(): Promise<readonly CharacterPack[]> {
    return repository.listForCharacter(kyra);
  }

  /** Attach Kyra to the campaign, written as SQL as `DrizzleCampaignPartyRepository` is not this context's. */
  async function attach(): Promise<void> {
    await database.db.execute(
      sql`insert into campaign_characters (id, campaign_id, member_id, character_id, attached_at) values (${newId()}, ${campaignId}, ${memberId}, ${kyra}, ${at})`,
    );
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
    const characters = new DrizzleCharacterRepository(database.db);
    const character = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    await characters.insert(character, { actor: amiri, command: CharacterCommand.CreateCharacter });
    kyra = character.id;

    const campaigns = new DrizzleCampaignRepository(database.db);
    const campaign = await campaigns.insert(
      new CampaignBuilder().named('Abomination Vaults').ranBy(ezren).withPlayer(amiri).build(),
    );
    campaignId = campaign.id;
    const member = campaign.members.find((candidate) => candidate.userId === amiri);
    if (member === undefined) {
      throw new Error('Amiri is not in the campaign');
    }
    memberId = member.id;

    const packs = new DrizzleHomebrewPackRepository(database.db);
    spells = new HomebrewPackBuilder()
      .slug('amiri-spells')
      .titled('Spells')
      .ownedBy(amiri)
      .visibleTo(PackVisibility.Private)
      .build();
    feats = new HomebrewPackBuilder()
      .slug('amiri-feats')
      .titled('Feats')
      .ownedBy(amiri)
      .visibleTo(PackVisibility.Private)
      .build();
    items = new HomebrewPackBuilder()
      .slug('ezren-items')
      .titled('Items')
      .ownedBy(ezren)
      .visibleTo(PackVisibility.Private)
      .build();
    await Promise.all([spells, feats, items].map(async (pack) => packs.insert(pack)));
    const dependencies = new DrizzlePackDependencyRepository(database.db);
    const directory = new DrizzlePackDirectory(database.db);
    await database.db.execute(
      sql`insert into content_pack_deps (id, pack_id, depends_on) values (${newId()}, ${feats.id}, ${spells.id})`,
    );
    const access = new PackAccessPolicy(new CampaignPackEnablementDirectory(database.db));
    repository = new DrizzleCharacterPackRepository(database.db);
    campaignPacks = new DrizzleCampaignPackRepository(database.db);
    service = new CharacterPackService(
      {
        characters,
        packs: repository,
        catalog: new HomebrewPackCatalog(directory, dependencies, access),
        campaigns: new CampaignPackDirectory(database.db),
      },
      clock,
    );
  });

  beforeEach(async () => {
    await database.db.execute(sql`delete from character_packs where character_id = ${kyra}`);
    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyra}`);
    await database.db.execute(sql`delete from campaign_packs where campaign_id = ${campaignId}`);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('enables a pack, even a private one, with the packs it extends, recording who did it', async () => {
    const packs = await service.enable(amiri, kyra, { packId: ContentPackId.parse(feats.id) });
    expect(packs.enabled.filter((pack) => !pack.official).map((pack) => String(pack.title))).toStrictEqual([
      'Feats',
      'Spells',
    ]);
    const rows = await stored();
    expect(rows.map((row) => row.enabledBy)).toStrictEqual([amiri, amiri]);
  });

  test('enabling twice stores each pack once', async () => {
    await service.enable(amiri, kyra, { packId: ContentPackId.parse(feats.id) });
    await service.enable(amiri, kyra, { packId: ContentPackId.parse(spells.id) });
    expect(await stored()).toHaveLength(2);
  });

  test('a pack its owner cannot read is not found', async () => {
    const refusal = await service
      .enable(amiri, kyra, { packId: ContentPackId.parse(items.id) })
      .catch((error: unknown) => error);
    expect(refusal).toMatchObject({ name: 'NotFoundError' });
  });

  test('attaching to a campaign switches the effective set to the campaign’s, and detaching switches it back', async () => {
    await service.enable(amiri, kyra, { packId: ContentPackId.parse(spells.id) });
    await database.db.execute(sql`update content_packs set visibility = 'campaign' where id = ${items.id}`);
    await campaignPacks.enable(
      ezren,
      {
        campaignId,
        packs: [
          {
            id: CampaignPackId.parse(newId()),
            packId: ContentPackId.parse(items.id),
            enabledBy: ezren,
            enabledAt: clock.now(),
          },
        ],
      },
      async () => {},
    );
    await attach();

    const attached = await service.packs(amiri, kyra);
    expect(attached.decidedBy).toBe(PackAuthority.Campaign);
    expect(String(attached.campaign)).toBe('Abomination Vaults');
    expect(attached.enabled.filter((pack) => !pack.official).map((pack) => String(pack.title))).toStrictEqual([
      'Items',
    ]);

    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyra}`);
    const detached = await service.packs(amiri, kyra);
    expect(detached.decidedBy).toBe(PackAuthority.Character);
    expect(detached.enabled.filter((pack) => !pack.official).map((pack) => String(pack.title))).toStrictEqual([
      'Spells',
    ]);
  });

  test('every lookup is served by an index', async () => {
    await service.enable(amiri, kyra, { packId: ContentPackId.parse(spells.id) });
    await attach();
    await service.packs(amiri, kyra);
    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyra}`);
    await service.disable(amiri, kyra, ContentPackId.parse(spells.id));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  test('deleting the pack, the user who enabled it or the character', async () => {
    await service.enable(amiri, kyra, { packId: ContentPackId.parse(feats.id) });
    await database.db.execute(sql`delete from content_packs where id = ${feats.id}`);
    const afterPack = await stored();
    expect(afterPack.map((row) => row.packId)).toStrictEqual([spells.id]);

    const stranger = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${stranger}, 'User', false, ${at}, ${at})`,
    );
    await database.db.execute(sql`update character_packs set enabled_by = ${stranger}`);
    await database.db.execute(sql`delete from users where id = ${stranger}`);
    const [afterUser] = await stored();
    expect(afterUser?.enabledBy).toBeUndefined();

    await database.db.execute(sql`delete from characters where id = ${kyra}`);
    expect(await stored()).toStrictEqual([]);
  });
});
