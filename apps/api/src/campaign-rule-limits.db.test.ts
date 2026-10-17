import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CampaignRuleLimitService } from '@pioneer/campaign/application';
import { RuleLimitKey, RuleLimitValue } from '@pioneer/campaign/domain';
import type { CampaignId, CampaignMemberId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignRepository, DrizzleCampaignRuleLimitRepository } from '@pioneer/campaign/infrastructure';
import { CharacterRuleLimits } from '@pioneer/character/application';
import { CharacterCommand, CORE_RULE_LIMITS, InvestedCount } from '@pioneer/character/domain';
import type { Character, CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();
const twelve = RuleLimitValue.parse(12);

describe.skipIf(adminUrl === undefined)('campaign table limits over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCampaignRuleLimitRepository;
  let service: CampaignRuleLimitService;
  let limits: CharacterRuleLimits;
  let kyra: Character;
  let kyraId: CharacterId;
  let campaignId: CampaignId;
  let memberId: CampaignMemberId;

  /** Attach Kyra to the campaign, written as SQL as `DrizzleCampaignPartyRepository` is not this context's. */
  async function attach(): Promise<void> {
    await database.db.execute(
      sql`insert into campaign_characters (id, campaign_id, member_id, character_id, attached_at) values (${newId()}, ${campaignId}, ${memberId}, ${kyraId}, ${at})`,
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
    kyra = new CharacterBuilder().named('Kyra').ownedBy(amiri).build();
    kyraId = kyra.id;
    await characters.insert(kyra, { actor: amiri, command: CharacterCommand.CreateCharacter });

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

    repository = new DrizzleCampaignRuleLimitRepository(database.db);
    service = new CampaignRuleLimitService({ campaigns, limits: repository }, clock);
    limits = new CharacterRuleLimits(new CampaignPackDirectory(database.db));
  });

  beforeEach(async () => {
    await database.db.execute(sql`delete from campaign_rule_limits where campaign_id = ${campaignId}`);
    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyraId}`);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a limit is one row however often it is set, recording who set it', async () => {
    await service.set(ezren, campaignId, { limit: RuleLimitKey.InvestedMax, value: twelve });
    await service.set(ezren, campaignId, { limit: RuleLimitKey.InvestedMax, value: RuleLimitValue.parse(8) });
    const rows = await repository.listForCampaign(campaignId);
    expect(rows.map((row) => [row.limit, row.value, row.setBy])).toStrictEqual([
      [RuleLimitKey.InvestedMax, RuleLimitValue.parse(8), ezren],
    ]);
  });

  test('a character outside the campaign has the core limits; attached, it has the campaign’s', async () => {
    await service.set(ezren, campaignId, { limit: RuleLimitKey.InvestedMax, value: twelve });
    expect(await limits.of(kyra)).toStrictEqual(CORE_RULE_LIMITS);
    await attach();
    expect(await limits.of(kyra)).toStrictEqual({ ...CORE_RULE_LIMITS, investedMax: InvestedCount.parse(12) });
    await service.reset(ezren, campaignId, RuleLimitKey.InvestedMax);
    expect(await limits.of(kyra)).toStrictEqual(CORE_RULE_LIMITS);
  });

  test('every lookup is served by an index', async () => {
    await service.set(ezren, campaignId, { limit: RuleLimitKey.HandsMax, value: RuleLimitValue.parse(3) });
    await service.ruleLimits(amiri, campaignId);
    await attach();
    await limits.of(kyra);
    await service.reset(ezren, campaignId, RuleLimitKey.HandsMax);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });

  test('deleting the GM who set it keeps the limit, and the campaign keeps its limits', async () => {
    await service.set(ezren, campaignId, { limit: RuleLimitKey.InvestedMax, value: twelve });
    const stranger = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${stranger}, 'User', false, ${at}, ${at})`,
    );
    await database.db.execute(sql`update campaign_rule_limits set set_by = ${stranger}`);
    await database.db.execute(sql`delete from users where id = ${stranger}`);
    const [row] = await repository.listForCampaign(campaignId);
    expect([row?.value, row?.setBy]).toStrictEqual([twelve, undefined]);
  });
});
