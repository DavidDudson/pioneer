import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignRole } from '@pioneer/campaign/domain';
import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

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

describe.skipIf(adminUrl === undefined)('DrizzleCampaignRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  const ezren = UserId.parse(newId());
  const seelah = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleCampaignRepository;

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    repository = new DrizzleCampaignRepository(database.db);
    await Promise.all([fixtureGmId, ezren, seelah].map(async (id) => insertUser(database, id)));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('insert and find round-trip, members included', async () => {
    const vaults = new CampaignBuilder().named('Abomination Vaults').withPlayer(ezren).build();
    const inserted = await repository.insert(vaults);
    expect(inserted).toStrictEqual(vaults);
    expect(await repository.findById(vaults.id)).toStrictEqual(vaults);
  });

  test('a member’s list holds only their campaigns, in the order they joined', async () => {
    const later = at.add({ hours: 1 });
    const kingmaker = new CampaignBuilder().named('Kingmaker').ranBy(seelah).createdAt(later).build();
    const alkenstar = new CampaignBuilder().named('Outlaws of Alkenstar').ranBy(seelah).withPlayer(ezren).build();
    const strangers = new CampaignBuilder().named('Season of Ghosts').ranBy(fixtureGmId).build();
    await repository.insert(kingmaker);
    await repository.insert(alkenstar);
    await repository.insert(strangers);

    const listed = await repository.listForMember(seelah);
    expect(listed.map((campaign) => campaign.id)).toStrictEqual([alkenstar.id, kingmaker.id]);
    const [first] = listed;
    expect(first?.members.map((member) => [member.userId, member.role])).toStrictEqual([
      [seelah, CampaignRole.Gm],
      [ezren, CampaignRole.Player],
    ]);
    const stranger = UserId.parse(newId());
    expect(await repository.listForMember(stranger)).toStrictEqual([]);
  });

  test('a user is a member of a campaign once', async () => {
    const gatewalkers = await repository.insert(new CampaignBuilder().named('Gatewalkers').build());
    const error = await rejection(
      database.db.execute(
        sql`insert into campaign_members (id, campaign_id, user_id, role, joined_at) values (${newId()}, ${gatewalkers.id}, ${fixtureGmId}, 'player', ${at.toString()})`,
      ),
    );
    expect(String((error as Error).cause)).toContain('campaign_members_campaign_user_idx');
  });

  test('a campaign has one GM member', async () => {
    const wardens = await repository.insert(new CampaignBuilder().named('Wardens of Wildwood').build());
    const error = await rejection(
      database.db.execute(
        sql`insert into campaign_members (id, campaign_id, user_id, role, joined_at) values (${newId()}, ${wardens.id}, ${ezren}, 'gm', ${at.toString()})`,
      ),
    );
    expect(String((error as Error).cause)).toContain('campaign_members_one_gm_idx');
  });

  test('a GM and every member must be existing users', async () => {
    const orphanGm = new CampaignBuilder().named('Orphaned').ranBy(UserId.parse(newId())).build();
    const gmError = await rejection(repository.insert(orphanGm));
    expect(String((gmError as Error).cause)).toContain('campaigns_gm_id_users_id_fk');
    expect(await repository.findById(orphanGm.id)).toBeUndefined();

    const orphanPlayer = new CampaignBuilder().named('Stray').withPlayer(UserId.parse(newId())).build();
    const playerError = await rejection(repository.insert(orphanPlayer));
    expect(String((playerError as Error).cause)).toContain('campaign_members_user_id_users_id_fk');
    // The campaign and its members are written together or not at all.
    expect(await repository.findById(orphanPlayer.id)).toBeUndefined();
  });

  test('deleting a user removes their memberships', async () => {
    const gone = UserId.parse(newId());
    await insertUser(database, gone);
    const party = new CampaignBuilder().named('Sky King’s Tomb').withPlayer(gone).build();
    await repository.insert(party);
    await database.db.execute(sql`delete from users where id = ${gone}`);
    const found = await repository.findById(party.id);
    expect(found?.roleOf(gone)).toBeUndefined();
    expect(found?.roleOf(fixtureGmId)).toBe(CampaignRole.Gm);
  });

  test('every query the repository issued is served by an index', async () => {
    await repository.listForMember(fixtureGmId);
    await repository.findById(new CampaignBuilder().named('Abomination Vaults').build().id);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
