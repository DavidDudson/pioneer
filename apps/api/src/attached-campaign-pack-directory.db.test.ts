import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { AttachedCampaignName, CharacterId } from '@pioneer/character/domain';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { CampaignPackDirectory } from './attached-campaign-pack-directory';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const at = fixedClock('2026-10-15T08:00:00Z').now().toString();

describe.skipIf(adminUrl === undefined)('CampaignPackDirectory (postgres)', () => {
  const gm = UserId.parse(newId());
  const campaignId = newId();
  const memberId = newId();
  const characterId = CharacterId.parse(newId());
  let database: TestDatabase;
  let directory: CampaignPackDirectory;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', new QueryRecorder());
    await database.db.execute(
      sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${gm}, 'GM', false, ${at}, ${at})`,
    );
    await database.db.execute(
      sql`insert into campaigns (id, version, name, gm_id, created_at) values (${campaignId}, 1, 'Kingmaker', ${gm}, ${at})`,
    );
    await database.db.execute(
      sql`insert into campaign_members (id, campaign_id, user_id, role, joined_at) values (${memberId}, ${campaignId}, ${gm}, 'gm', ${at})`,
    );
    directory = new CampaignPackDirectory(database.db);
  });

  afterAll(async () => {
    await database.drop();
  });

  test('a character in a live campaign has its campaign; archiving the campaign takes it away, restoring gives it back', async () => {
    await database.db.execute(
      sql`insert into characters (id, version, owner_id, name, level, schema_version, document, created_at, updated_at) values (${characterId}, 1, ${gm}, 'Kyra', 1, 1, ${JSON.stringify({ schemaVersion: 1, id: characterId, ownerId: gm, name: 'Kyra', level: 1 })}::jsonb, ${at}, ${at})`,
    );
    await database.db.execute(
      sql`insert into campaign_characters (id, campaign_id, member_id, character_id, attached_at) values (${newId()}, ${campaignId}, ${memberId}, ${characterId}, ${at})`,
    );
    const live = await directory.of(characterId);
    expect(live?.name).toBe(AttachedCampaignName.parse('Kingmaker'));

    await database.db.execute(sql`update campaigns set archived_at = ${at} where id = ${campaignId}`);
    expect(await directory.of(characterId)).toBeUndefined();

    await database.db.execute(sql`update campaigns set archived_at = null where id = ${campaignId}`);
    const restored = await directory.of(characterId);
    expect(restored?.name).toBe(AttachedCampaignName.parse('Kingmaker'));
  });
});
