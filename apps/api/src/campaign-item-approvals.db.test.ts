import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignItemApprovalId,
  ItemRule,
  ReviewedCount,
  ReviewedItemId,
  ReviewedRuneId,
} from '@pioneer/campaign/domain';
import type { CampaignId, CampaignItemApproval, CampaignMemberId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignItemApprovalRepository, DrizzleCampaignRepository } from '@pioneer/campaign/infrastructure';
import { CharacterCommand } from '@pioneer/character/domain';
import type { Character, CharacterId } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();
const caliburn = ReviewedItemId.parse(newId());

describe.skipIf(adminUrl === undefined)('approved rule-breaking items over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCampaignItemApprovalRepository;
  let kyra: Character;
  let kyraId: CharacterId;
  let campaignId: CampaignId;
  let memberId: CampaignMemberId;

  function approval(overrides: Partial<CampaignItemApproval> = {}): CampaignItemApproval {
    return {
      id: CampaignItemApprovalId.parse(newId()),
      character: kyraId,
      item: caliburn,
      rule: ItemRule.PropertyRunes,
      rune: undefined,
      value: ReviewedCount.parse(7),
      approvedBy: ezren,
      approvedAt: clock.now(),
      ...overrides,
    };
  }

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
    repository = new DrizzleCampaignItemApprovalRepository(database.db);
  });

  /** A fresh campaign for each test, as approvals are never deleted. */
  beforeEach(async () => {
    const campaign = await new DrizzleCampaignRepository(database.db).insert(
      new CampaignBuilder().named('Abomination Vaults').ranBy(ezren).withPlayer(amiri).build(),
    );
    campaignId = campaign.id;
    const member = campaign.members.find((candidate) => candidate.userId === amiri);
    if (member === undefined) {
      throw new Error('Amiri is not in the campaign');
    }
    memberId = member.id;
    await database.db.execute(sql`delete from campaign_characters where character_id = ${kyraId}`);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an approval is one live row however often it is given, at the count last approved', async () => {
    await repository.approve(ezren, campaignId, approval());
    await repository.approve(ezren, campaignId, approval({ value: ReviewedCount.parse(8) }));
    const rows = await repository.listForCampaign(campaignId);
    expect(rows.map((row) => [row.item, row.rule, row.value, row.approvedBy])).toStrictEqual([
      [caliburn, ItemRule.PropertyRunes, 8, ezren],
    ]);
  });

  test('a rune not allowed is approved per rune, and the other rules keep no rune', async () => {
    const flaming = ReviewedRuneId.parse(newId());
    const frost = ReviewedRuneId.parse(newId());
    const misfit = { rule: ItemRule.RuneNotAllowed, value: ReviewedCount.parse(1) };
    await repository.approve(ezren, campaignId, approval({ ...misfit, rune: flaming }));
    await repository.approve(ezren, campaignId, approval({ ...misfit, rune: frost }));
    await repository.approve(ezren, campaignId, approval());
    const rows = await repository.listForCampaign(campaignId);
    expect(new Set(rows.map((row) => row.rune))).toStrictEqual(new Set([flaming, frost, undefined]));
  });

  test('revoking archives the row: it stays, no read sees it, and the item can be approved again', async () => {
    const first = approval();
    await repository.approve(ezren, campaignId, first);
    await repository.revoke(ezren, campaignId, { id: first.id, at: clock.now() });
    await repository.revoke(ezren, campaignId, { id: first.id, at: clock.now() });
    expect(await repository.listForCampaign(campaignId)).toStrictEqual([]);
    const kept = await database.db.execute(sql`select archived_at from campaign_item_approvals where id = ${first.id}`);
    expect(kept).toHaveLength(1);

    await repository.approve(ezren, campaignId, approval());
    expect(await repository.listForCampaign(campaignId)).toHaveLength(1);
  });

  test('the database refuses to delete an approval (ADR-0062)', async () => {
    await repository.approve(ezren, campaignId, approval());
    const error = await rejection(
      database.db.execute(sql`delete from campaign_item_approvals where campaign_id = ${campaignId}`),
    );
    expect(error).toBeInstanceOf(Error);
  });

  test('a character outside the campaign has no approvals; attached, it has the campaign’s', async () => {
    await repository.approve(ezren, campaignId, approval());
    const directory = new CampaignPackDirectory(database.db);
    expect(await directory.of(kyraId)).toBeUndefined();
    await attach();
    const attached = await directory.of(kyraId);
    expect(attached?.approvals).toMatchObject([{ item: caliburn, rule: ItemRule.PropertyRunes, value: 7 }]);
  });

  test('deleting the GM who approved it keeps the approval', async () => {
    const gone = UserId.parse(newId());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${gone}, 'User', false, ${at}, ${at})`,
    );
    await repository.approve(gone, campaignId, approval({ approvedBy: gone }));
    await database.db.execute(sql`delete from users where id = ${gone}`);
    const [row] = await repository.listForCampaign(campaignId);
    expect([row?.value, row?.approvedBy]).toStrictEqual([7, undefined]);
  });

  test('every lookup is served by an index', async () => {
    await repository.approve(ezren, campaignId, approval());
    await repository.listForCampaign(campaignId);
    await attach();
    await new CampaignPackDirectory(database.db).of(kyraId);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
