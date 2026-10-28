import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import {
  CharacterId as CampaignCharacterId,
  ItemTransferId,
  ReviewedItemId,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { CampaignId, ItemTransfer } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignRepository, DrizzleItemTransferRepository } from '@pioneer/campaign/infrastructure';
import { CharacterCommand, CoinsSchema, InventoryItemId, ItemQuantity, STOWED } from '@pioneer/character/domain';
import type { Character } from '@pioneer/character/domain';
import { CharacterBuilder, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { ConflictError, fixedClock, newId, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { and, eq, sql } from 'drizzle-orm';

import { DatabaseTransferSettlement } from './database-transfer-settlement';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();
const ROPE_QUANTITY = ItemQuantity.parse(1);
const RACE_ROUNDS = 20;

interface Race {
  readonly oneWinner: boolean;
  readonly loserIsConflict: boolean;
  readonly outcomeHolds: boolean;
}

describe.skipIf(adminUrl === undefined)('withdrawing a campaign transfer over postgres', () => {
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let characters: DrizzleCharacterRepository;
  let transfers: DrizzleItemTransferRepository;
  let settlement: DatabaseTransferSettlement;
  let campaignId: CampaignId;
  let campaignCount = 0;
  let characterCount = 0;

  async function characterWith(owner: UserId, rope?: InventoryItemId): Promise<Character> {
    const built = new CharacterBuilder()
      .named(`Hero ${(characterCount += 1)}`)
      .ownedBy(owner)
      .build();
    const items =
      rope === undefined
        ? []
        : [{ id: rope, item: itemFixtureId(ItemFixture.Rope), quantity: ROPE_QUANTITY, carry: STOWED }];
    const stocked = built.withInventory({ items, coins: CoinsSchema.parse({}) }, built.updatedAt);
    return characters.insert(stocked, { actor: owner, command: CharacterCommand.CreateCharacter });
  }

  async function offerLine(giver: Character, recipient: Character, line: InventoryItemId): Promise<ItemTransfer> {
    const transfer = {
      id: ItemTransferId.parse(newId()),
      from: CampaignCharacterId.parse(giver.id),
      to: CampaignCharacterId.parse(recipient.id),
      item: ReviewedItemId.parse(line),
      giverVersion: giver.version,
      status: TransferStatus.Pending,
      createdAt: clock.now(),
    };
    await transfers.insert(amiri, campaignId, transfer);
    return transfer;
  }

  async function withdraw(transfer: ItemTransfer): Promise<boolean> {
    return transfers.answer({ actor: amiri, campaignId, id: transfer.id, status: TransferStatus.Withdrawn });
  }

  async function statusOf(transfer: ItemTransfer): Promise<string | undefined> {
    const found = await transfers.findById(campaignId, transfer.id);
    return found?.status;
  }

  beforeAll(async () => {
    database = await createTestDatabase(adminUrl ?? '');
    await Promise.all(
      [amiri, ezren].map(async (user) =>
        database.db.execute(
          sql`insert into users (id, display_name, email_verified, created_at, updated_at) values (${user}, 'User', false, ${at}, ${at})`,
        ),
      ),
    );
    characters = new DrizzleCharacterRepository(database.db);
    transfers = new DrizzleItemTransferRepository(database.db);
    settlement = new DatabaseTransferSettlement(database.db, clock);
  });

  beforeEach(async () => {
    campaignCount += 1;
    const campaign = await new DrizzleCampaignRepository(database.db).insert(
      new CampaignBuilder().named(`Abomination Vaults ${campaignCount}`).ranBy(ezren).withPlayer(amiri).build(),
    );
    campaignId = campaign.id;
  });

  afterAll(async () => {
    await database.drop();
  });

  test('withdrawing marks the offer withdrawn, touches neither character and is audited under its command', async () => {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, rope);
    const recipient = await characterWith(ezren);
    const offer = await offerLine(giver, recipient, rope);

    const withdrawn = await withdraw(offer);

    const [giverNow, recipientNow] = await Promise.all([
      characters.findById(giver.id),
      characters.findById(recipient.id),
    ]);
    const audited = await database.db
      .select({ command: auditLog.command })
      .from(auditLog)
      .where(and(eq(auditLog.action, 'update'), eq(auditLog.rowId, offer.id)));
    expect(withdrawn).toBe(true);
    expect(await statusOf(offer)).toBe(TransferStatus.Withdrawn);
    expect(giverNow?.version).toBe(giver.version);
    expect(giverNow?.document.inventory.items).toHaveLength(1);
    expect(recipientNow?.version).toBe(recipient.version);
    expect(audited.map((row) => row.command)).toStrictEqual(['withdraw-campaign-transfer']);
  });

  test('accepting a withdrawn offer is the already-answered conflict and moves nothing', async () => {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, rope);
    const recipient = await characterWith(ezren);
    const offer = await offerLine(giver, recipient, rope);
    await withdraw(offer);

    const failed = await rejection(settlement.accept(ezren, campaignId, offer));

    const recipientNow = await characters.findById(recipient.id);
    expect(failed).toBeInstanceOf(ConflictError);
    expect(recipientNow?.document.inventory.items).toStrictEqual([]);
    expect(await statusOf(offer)).toBe(TransferStatus.Withdrawn);
  });

  /** One offer accepted and withdrawn at once, and what each side did and left behind. */
  async function race(): Promise<Race> {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, rope);
    const recipient = await characterWith(ezren);
    const offer = await offerLine(giver, recipient, rope);
    const [accepted, withdrawn] = await Promise.allSettled([
      settlement.accept(ezren, campaignId, offer),
      withdraw(offer),
    ]);
    const [giverNow, recipientNow, status] = await Promise.all([
      characters.findById(giver.id),
      characters.findById(recipient.id),
      statusOf(offer),
    ]);
    const acceptWon = accepted.status === 'fulfilled';
    const withdrawWon = withdrawn.status === 'fulfilled' && withdrawn.value;
    const loserIsConflict = accepted.status === 'fulfilled' || accepted.reason instanceof ConflictError;
    return {
      oneWinner: acceptWon !== withdrawWon,
      loserIsConflict,
      outcomeHolds: acceptWon
        ? status === TransferStatus.Accepted &&
          giverNow?.document.inventory.items.length === 0 &&
          recipientNow?.document.inventory.items.length === 1
        : status === TransferStatus.Withdrawn &&
          giverNow?.document.inventory.items.length === 1 &&
          recipientNow?.document.inventory.items.length === 0,
    };
  }

  test('a withdraw and an accept at once: exactly one wins and the line is where the winner puts it', async () => {
    const races = await Promise.all(Array.from({ length: RACE_ROUNDS }, async () => race()));

    expect(races).toHaveLength(RACE_ROUNDS);
    expect(races.filter((each) => !each.oneWinner)).toStrictEqual([]);
    expect(races.filter((each) => !each.loserIsConflict)).toStrictEqual([]);
    expect(races.filter((each) => !each.outcomeHolds)).toStrictEqual([]);
  });

  test('two withdraws at once: one writes, the other finds no pending row', async () => {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, rope);
    const recipient = await characterWith(ezren);
    const offer = await offerLine(giver, recipient, rope);

    const results = await Promise.all([withdraw(offer), withdraw(offer)]);

    expect(results.toSorted()).toStrictEqual([false, true]);
    expect(await statusOf(offer)).toBe(TransferStatus.Withdrawn);
  });
});
