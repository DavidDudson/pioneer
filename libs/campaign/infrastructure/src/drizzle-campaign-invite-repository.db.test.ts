import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignInvite, CampaignInviteId, INVITE_LIFETIME, InviteTokenHash } from '@pioneer/campaign/domain';
import type { Campaign } from '@pioneer/campaign/domain';
import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { fixedClock, newId, sha256Hex, UserId } from '@pioneer/shared/kernel';
import type { Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DrizzleCampaignInviteRepository } from './drizzle-campaign-invite-repository';
import { DrizzleCampaignRepository } from './drizzle-campaign-repository';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const at = fixedClock('2026-10-10T10:00:00Z').now();

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const now = at.toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Member', false, ${now}, ${now})`,
  );
}

/** An invite to `campaign` made by its GM at `now`, with a hash no other invite shares. */
async function invite(campaign: Campaign, now: Temporal.Instant = at): Promise<CampaignInvite> {
  const tokenHash = InviteTokenHash.parse(await sha256Hex(newId()));
  return CampaignInvite.issue({
    id: CampaignInviteId.parse(newId()),
    campaignId: campaign.id,
    tokenHash,
    createdBy: campaign.gmId,
    now,
  });
}

describe.skipIf(adminUrl === undefined)('DrizzleCampaignInviteRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let campaigns: DrizzleCampaignRepository;
  let repository: DrizzleCampaignInviteRepository;
  let vaults: Campaign;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    campaigns = new DrizzleCampaignRepository(database.db);
    repository = new DrizzleCampaignInviteRepository(database.db);
    await insertUser(database, fixtureGmId);
    vaults = await campaigns.insert(new CampaignBuilder().named('Abomination Vaults').build());
  });

  afterAll(async () => {
    await database.drop();
  });

  test('insert, then find by id and by token hash', async () => {
    const issued = await invite(vaults);
    expect(await repository.insert(issued)).toStrictEqual(issued);
    expect(await repository.findById(issued.id)).toStrictEqual(issued);
    expect(await repository.findByTokenHash(issued.tokenHash)).toStrictEqual(issued);
    const unknown = InviteTokenHash.parse('0'.repeat(64));
    expect(await repository.findByTokenHash(unknown)).toBeUndefined();
  });

  test('the open list leaves out revoked and expired invites, newest first', async () => {
    const kingmaker = await campaigns.insert(new CampaignBuilder().named('Kingmaker').build());
    const older = await repository.insert(await invite(kingmaker));
    const newer = await repository.insert(await invite(kingmaker, at.add({ hours: 1 })));
    const revoked = await repository.insert(await invite(kingmaker, at.add({ hours: 2 })));
    await repository.revoke(revoked.revoke(at.add({ hours: 3 })));

    expect(await repository.listOpen(kingmaker.id, at.add({ hours: 3 }))).toStrictEqual([newer, older]);
    // The older one expires first; at its expiry instant it no longer works.
    expect(await repository.listOpen(kingmaker.id, older.expiresAt)).toStrictEqual([newer]);
    expect(await repository.listOpen(kingmaker.id, at.add(INVITE_LIFETIME).add({ hours: 1 }))).toStrictEqual([]);
  });

  test('a second revocation keeps the first time', async () => {
    const issued = await repository.insert(await invite(vaults));
    const first = await repository.revoke(issued.revoke(at.add({ minutes: 1 })));
    expect(first.revokedAt).toStrictEqual(at.add({ minutes: 1 }));
    const second = await repository.revoke(issued.revoke(at.add({ minutes: 2 })));
    expect(second).toStrictEqual(first);
    expect(await repository.findById(issued.id)).toStrictEqual(first);
  });

  test('token hashes are unique', async () => {
    const issued = await repository.insert(await invite(vaults));
    const twin = CampaignInvite.issue({
      id: CampaignInviteId.parse(newId()),
      campaignId: issued.campaignId,
      tokenHash: issued.tokenHash,
      createdBy: issued.createdBy,
      now: at,
    });
    const error = await rejection(repository.insert(twin));
    expect(String((error as Error).cause)).toContain('campaign_invites_token_hash_idx');
  });

  test('deleting the campaign, or the user who made an invite, deletes it', async () => {
    const gm = UserId.parse(newId());
    await insertUser(database, gm);
    const party = await campaigns.insert(new CampaignBuilder().named('Blood Lords').ranBy(gm).build());
    const issued = await repository.insert(await invite(party));
    await database.db.execute(sql`delete from campaigns where id = ${party.id}`);
    expect(await repository.findById(issued.id)).toBeUndefined();

    const other = await campaigns.insert(new CampaignBuilder().named('Season of Ghosts').ranBy(gm).build());
    const fromGm = await repository.insert(await invite(other));
    await database.db.execute(sql`delete from users where id = ${gm}`);
    expect(await repository.findById(fromGm.id)).toBeUndefined();
  });

  test('every query the repository issued is served by an index', async () => {
    const issued = await repository.insert(await invite(vaults));
    await repository.findById(issued.id);
    await repository.findByTokenHash(issued.tokenHash);
    await repository.listOpen(vaults.id, at);
    await repository.revoke(issued.revoke(at));
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
