import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { CharacterId, ItemTransferId, ReviewedItemId, TransferStatus } from '@pioneer/campaign/domain';
import type { CampaignId, ItemTransfer } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignRepository, DrizzleItemTransferRepository } from '@pioneer/campaign/infrastructure';
import { CharacterCommand } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { ConflictError, fixedClock, newId, UserId, Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { createTestDatabase, QueryRecorder, testDatabaseUrl, unindexedQueries } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { sql } from 'drizzle-orm';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();
const GIVER_VERSION = Version.parse(3);

describe.skipIf(adminUrl === undefined)('campaign item transfers over postgres', () => {
  const recorder = new QueryRecorder();
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let repository: DrizzleItemTransferRepository;
  let kyra: Character;
  let mordred: Character;
  let campaignId: CampaignId;
  let campaigns = 0;

  function offer(overrides: Partial<ItemTransfer> = {}): ItemTransfer {
    return {
      id: ItemTransferId.parse(newId()),
      from: CharacterId.parse(kyra.id),
      to: CharacterId.parse(mordred.id),
      item: ReviewedItemId.parse(newId()),
      giverVersion: GIVER_VERSION,
      status: TransferStatus.Pending,
      createdAt: clock.now(),
      ...overrides,
    };
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
    mordred = new CharacterBuilder().named('Mordred').ownedBy(ezren).build();
    await characters.insert(kyra, { actor: amiri, command: CharacterCommand.CreateCharacter });
    await characters.insert(mordred, { actor: ezren, command: CharacterCommand.CreateCharacter });
    repository = new DrizzleItemTransferRepository(database.db);
  });

  /** A fresh campaign for each test, as offers are never deleted. */
  beforeEach(async () => {
    campaigns += 1;
    const campaign = await new DrizzleCampaignRepository(database.db).insert(
      new CampaignBuilder().named(`Abomination Vaults ${campaigns}`).ranBy(ezren).withPlayer(amiri).build(),
    );
    campaignId = campaign.id;
  });

  afterAll(async () => {
    await database.drop();
  });

  test('an offer is stored with the giver version and listed oldest first', async () => {
    const first = offer();
    const second = offer({ createdAt: clock.now().add({ minutes: 1 }) });
    await repository.insert(amiri, campaignId, second);
    await repository.insert(amiri, campaignId, first);

    const pending = await repository.listPending(campaignId);

    expect(pending).toStrictEqual([first, second]);
  });

  test('another campaign sees none of them', async () => {
    await repository.insert(amiri, campaignId, offer());

    campaigns += 1;
    const other = await new DrizzleCampaignRepository(database.db).insert(
      new CampaignBuilder().named(`Abomination Vaults ${campaigns}`).ranBy(ezren).build(),
    );

    expect(await repository.listPending(other.id)).toStrictEqual([]);
  });

  test('the database allows one pending offer per line, and a new one once it is answered', async () => {
    const item = ReviewedItemId.parse(newId());
    const first = offer({ item });
    await repository.insert(amiri, campaignId, first);

    const refused = await rejection(repository.insert(amiri, campaignId, offer({ item })));
    expect(refused).toBeInstanceOf(ConflictError);
    await database.db.execute(
      sql`update campaign_item_transfers set status = ${TransferStatus.Declined} where id = ${first.id}`,
    );
    await repository.insert(amiri, campaignId, offer({ item }));

    expect(refused).toBeInstanceOf(Error);
    expect(await repository.listPending(campaignId)).toHaveLength(1);
  });

  test('two offers of one line at once: one is stored, the other is a conflict', async () => {
    const item = ReviewedItemId.parse(newId());

    const results = await Promise.allSettled([
      repository.insert(amiri, campaignId, offer({ item })),
      repository.insert(amiri, campaignId, offer({ item })),
    ]);

    const refused = results.filter((result) => result.status === 'rejected');
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(refused).toHaveLength(1);
    expect(refused[0]?.reason).toBeInstanceOf(ConflictError);
    expect(await repository.listPending(campaignId)).toHaveLength(1);
  });

  test('the database refuses to delete an offer (ADR-0062)', async () => {
    await repository.insert(amiri, campaignId, offer());

    const error = await rejection(
      database.db.execute(sql`delete from campaign_item_transfers where campaign_id = ${campaignId}`),
    );

    expect(error).toBeInstanceOf(Error);
  });

  test('both characters must exist', async () => {
    const nobody = CharacterId.parse(newId());
    const missingGiver = await rejection(repository.insert(amiri, campaignId, offer({ from: nobody })));
    const missingRecipient = await rejection(repository.insert(amiri, campaignId, offer({ to: nobody })));

    expect(missingGiver).toBeInstanceOf(Error);
    expect(missingRecipient).toBeInstanceOf(Error);
  });

  test('every lookup is served by an index', async () => {
    await repository.insert(amiri, campaignId, offer());
    await repository.listPending(campaignId);
    expect(await unindexedQueries(database.db, recorder)).toStrictEqual([]);
  });
});
