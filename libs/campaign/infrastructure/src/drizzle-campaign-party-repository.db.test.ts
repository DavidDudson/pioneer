import { afterAll, beforeAll, describe, expect, test } from 'bun:test';

import { CampaignCharacterId, CharacterId } from '@pioneer/campaign/domain';
import type { Campaign, CampaignCharacter, CampaignId, CampaignMember } from '@pioneer/campaign/domain';
import { CampaignBuilder, fixtureGmId } from '@pioneer/campaign/domain/testing';
import { fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

import { DrizzleCampaignPartyRepository } from './drizzle-campaign-party-repository';
import { DrizzleCampaignRepository } from './drizzle-campaign-repository';

/**
 * Runs against a throwaway Postgres database (see createTestDatabase).
 * Skipped when TEST_DATABASE_URL is unset; CI always sets it.
 */
const adminUrl = testDatabaseUrl();
const at = fixedClock('2026-10-10T10:00:00Z').now();
const ezren = UserId.parse(newId());
const seelah = UserId.parse(newId());

/** A bare users row, written as SQL: identity's tables are outside this context's boundary. */
async function insertUser(database: TestDatabase, id: UserId): Promise<void> {
  const now = at.toString();
  await database.db.execute(
    sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${id}, 'Member', false, ${now}, ${now})`,
  );
}

/** A bare characters row owned by `ownerId`, written as SQL: the character context's tables are outside this one's. */
async function insertCharacter(database: TestDatabase, ownerId: UserId): Promise<CharacterId> {
  const id = CharacterId.parse(newId());
  const now = at.toString();
  await database.db.execute(
    sql`insert into characters (id, version, owner_id, name, ancestry, level, attributes, created_at, updated_at) values (${id}, 1, ${ownerId}, 'Valeros', ${newId()}, 1, '{}'::jsonb, ${now}, ${now})`,
  );
  return id;
}

function memberOf(campaign: Campaign, userId: UserId): CampaignMember {
  const member = campaign.members.find((candidate) => candidate.userId === userId);
  if (member === undefined) {
    throw new Error(`No member ${userId}`);
  }
  return member;
}

/** A new attachment of `characterId` by `member`, `seconds` after `at`. */
function attachment(member: CampaignMember, characterId: CharacterId, seconds = 0): CampaignCharacter {
  return {
    id: CampaignCharacterId.parse(newId()),
    characterId,
    memberId: member.id,
    attachedAt: at.add({ seconds }),
  };
}

describe.skipIf(adminUrl === undefined)('DrizzleCampaignPartyRepository (postgres)', () => {
  const recorder = new QueryRecorder();
  let database: TestDatabase;
  let campaigns: DrizzleCampaignRepository;
  let repository: DrizzleCampaignPartyRepository;

  /** A new campaign run by the fixture GM with Ezren and Seelah as players. */
  async function newCampaign(name: string): Promise<Campaign> {
    return campaigns.insert(new CampaignBuilder().named(name).withPlayer(ezren).withPlayer(seelah).build());
  }

  /** `userId` attaches `characterId` to `campaign` through their own membership of it. */
  async function attachAs(
    campaign: Campaign,
    userId: UserId,
    characterId: CharacterId,
  ): Promise<CampaignId | undefined> {
    return repository.attach(campaign.id, attachment(memberOf(campaign, userId), characterId));
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '', recorder);
    campaigns = new DrizzleCampaignRepository(database.db);
    repository = new DrizzleCampaignPartyRepository(database.db);
    await Promise.all([fixtureGmId, ezren, seelah].map(async (id) => insertUser(database, id)));
  });

  afterAll(async () => {
    await database.drop();
  });

  test('attach, then list the party oldest first and find where characters are', async () => {
    const vaults = await newCampaign('Abomination Vaults');
    const [valeros, kyra, loose] = await Promise.all([
      insertCharacter(database, ezren),
      insertCharacter(database, seelah),
      insertCharacter(database, ezren),
    ]);
    const second = attachment(memberOf(vaults, ezren), valeros, 1);
    const first = attachment(memberOf(vaults, seelah), kyra);
    expect(await repository.attach(vaults.id, second)).toBe(vaults.id);
    expect(await repository.attach(vaults.id, first)).toBe(vaults.id);

    expect(await repository.listForCampaign(vaults.id)).toStrictEqual([first, second]);
    expect(await repository.campaignsOf([valeros, kyra, loose])).toStrictEqual(
      new Map([
        [valeros, vaults.id],
        [kyra, vaults.id],
      ]),
    );
    expect(await repository.campaignsOf([])).toStrictEqual(new Map());
  });

  test('a character is in one campaign at most; attaching it again keeps the first', async () => {
    const [vaults, kingmaker] = await Promise.all([newCampaign('Vaults again'), newCampaign('Kingmaker')]);
    const valeros = await insertCharacter(database, ezren);
    const kept = attachment(memberOf(vaults, ezren), valeros);
    await repository.attach(vaults.id, kept);

    expect(await attachAs(kingmaker, ezren, valeros)).toBe(vaults.id);
    expect(await attachAs(vaults, ezren, valeros)).toBe(vaults.id);
    expect(await repository.listForCampaign(kingmaker.id)).toStrictEqual([]);
    expect(await repository.listForCampaign(vaults.id)).toStrictEqual([kept]);
  });

  test('two attaches racing to different campaigns place the character in exactly one', async () => {
    const [vaults, kingmaker] = await Promise.all([newCampaign('Race one'), newCampaign('Race two')]);
    const valeros = await insertCharacter(database, ezren);
    const placed = await Promise.all([attachAs(vaults, ezren, valeros), attachAs(kingmaker, ezren, valeros)]);
    expect(placed[0]).toBe(placed[1]);
    const parties = await Promise.all([
      repository.listForCampaign(vaults.id),
      repository.listForCampaign(kingmaker.id),
    ]);
    expect(parties.map((party) => party.length).toSorted((left, right) => left - right)).toStrictEqual([0, 1]);
  });

  test('detach takes the character out of that campaign only; twice is harmless', async () => {
    const [vaults, kingmaker] = await Promise.all([newCampaign('Detach one'), newCampaign('Detach two')]);
    const valeros = await insertCharacter(database, ezren);
    const kept = attachment(memberOf(kingmaker, ezren), valeros);
    await repository.attach(kingmaker.id, kept);

    await repository.detach(vaults.id, valeros);
    expect(await repository.listForCampaign(kingmaker.id)).toStrictEqual([kept]);
    await repository.detach(kingmaker.id, valeros);
    await repository.detach(kingmaker.id, valeros);
    expect(await repository.listForCampaign(kingmaker.id)).toStrictEqual([]);
    expect(await repository.campaignsOf([valeros])).toStrictEqual(new Map());
  });

  test('a removed member’s characters leave with them, and they can’t attach any more', async () => {
    const vaults = await newCampaign('Removal');
    const [valeros, kyra, later] = await Promise.all([
      insertCharacter(database, ezren),
      insertCharacter(database, seelah),
      insertCharacter(database, ezren),
    ]);
    await attachAs(vaults, ezren, valeros);
    const kept = attachment(memberOf(vaults, seelah), kyra, 1);
    await repository.attach(vaults.id, kept);

    await campaigns.updateMembers(vaults.withoutMember(memberOf(vaults, ezren).id), vaults.version);
    expect(await repository.listForCampaign(vaults.id)).toStrictEqual([kept]);
    expect(await attachAs(vaults, ezren, later)).toBeUndefined();
    expect(await repository.campaignsOf([later])).toStrictEqual(new Map());
  });

  test('a member of another campaign can’t attach to this one', async () => {
    const [vaults, kingmaker] = await Promise.all([newCampaign('Mine'), newCampaign('Theirs')]);
    const valeros = await insertCharacter(database, ezren);
    // Ezren's membership of Kingmaker, sent with Vaults' id.
    const elsewhere = attachment(memberOf(kingmaker, ezren), valeros);
    expect(await repository.attach(vaults.id, elsewhere)).toBeUndefined();
  });

  test('deleting a character or its campaign takes it out of the party', async () => {
    const [vaults, kingmaker] = await Promise.all([newCampaign('Deleted character'), newCampaign('Deleted campaign')]);
    const [valeros, kyra] = await Promise.all([insertCharacter(database, ezren), insertCharacter(database, seelah)]);
    await attachAs(vaults, ezren, valeros);
    await attachAs(kingmaker, seelah, kyra);

    await database.db.execute(sql`delete from characters where id = ${valeros}`);
    await database.db.execute(sql`delete from campaigns where id = ${kingmaker.id}`);
    expect(await repository.listForCampaign(vaults.id)).toStrictEqual([]);
    expect(await repository.campaignsOf([kyra])).toStrictEqual(new Map());
  });

  test('every query the repository issued is served by an index', async () => {
    const vaults = await newCampaign('Query plans');
    const valeros = await insertCharacter(database, ezren);
    await attachAs(vaults, ezren, valeros);
    await repository.listForCampaign(vaults.id);
    await repository.campaignsOf([valeros]);
    await repository.detach(vaults.id, valeros);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
