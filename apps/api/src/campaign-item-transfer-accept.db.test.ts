import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';

import { ItemTransferMessage } from '@pioneer/campaign/application';
import {
  CharacterId as CampaignCharacterId,
  ItemTransferId,
  OfferedCoinsSchema,
  ReviewedItemId,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { CampaignId, Transfer } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { DrizzleCampaignRepository, DrizzleItemTransferRepository } from '@pioneer/campaign/infrastructure';
import { CharacterCommand, CoinsSchema, InventoryItemId, ItemQuantity, STOWED } from '@pioneer/character/domain';
import type { Character, Inventory } from '@pioneer/character/domain';
import { CharacterBuilder, ItemFixture, itemFixtureId } from '@pioneer/character/domain/testing';
import { DrizzleCharacterRepository } from '@pioneer/character/infrastructure';
import { ConflictError, fixedClock, newId, nextVersion, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';
import { auditLog } from '@pioneer/shared/server';
import { createTestDatabase, testDatabaseUrl } from '@pioneer/shared/server/testing';
import type { TestDatabase } from '@pioneer/shared/server/testing';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { DatabaseTransferSettlement } from './database-transfer-settlement';

/** Uses the disposable TEST_DATABASE_URL (see AGENTS.md). */
const adminUrl = testDatabaseUrl();
const clock = fixedClock('2026-10-17T10:00:00Z');
const at = clock.now().toString();
const ROPE_QUANTITY = ItemQuantity.parse(1);

interface Stored {
  readonly giver: Character;
  readonly recipient: Character;
}

describe.skipIf(adminUrl === undefined)('accepting a campaign transfer over postgres', () => {
  const amiri = UserId.parse(newId());
  const ezren = UserId.parse(newId());
  let database: TestDatabase;
  let characters: DrizzleCharacterRepository;
  let transfers: DrizzleItemTransferRepository;
  let settlement: DatabaseTransferSettlement;
  let campaignId: CampaignId;
  let campaignCount = 0;
  let characterCount = 0;

  /** A character owned by `owner` with a rope line (when `rope` names it) and the coins given. */
  async function characterWith(
    owner: UserId,
    inventory: Partial<Inventory>,
    rope?: InventoryItemId,
  ): Promise<Character> {
    const built = new CharacterBuilder()
      .named(`Hero ${(characterCount += 1)}`)
      .ownedBy(owner)
      .build();
    const lines =
      rope === undefined
        ? []
        : [{ id: rope, item: itemFixtureId(ItemFixture.Rope), quantity: ROPE_QUANTITY, carry: STOWED }];
    const stocked = built.withInventory({ items: lines, coins: CoinsSchema.parse({}), ...inventory }, built.updatedAt);
    return characters.insert(stocked, { actor: owner, command: CharacterCommand.CreateCharacter });
  }

  async function statusOf(transfer: Transfer): Promise<string | undefined> {
    const found = await transfers.findById(campaignId, transfer.id);
    return found?.status;
  }

  async function offerLine(giver: Character, recipient: Character, line: InventoryItemId): Promise<Transfer> {
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

  async function offerCoins(giver: Character, recipient: Character, gold: number): Promise<Transfer> {
    const transfer = {
      id: ItemTransferId.parse(newId()),
      from: CampaignCharacterId.parse(giver.id),
      to: CampaignCharacterId.parse(recipient.id),
      coins: OfferedCoinsSchema.parse({ gp: gold }),
      giverVersion: giver.version,
      status: TransferStatus.Pending,
      createdAt: clock.now(),
    };
    await transfers.insertCoins(amiri, campaignId, transfer);
    return transfer;
  }

  /** The two characters as stored now. */
  async function stored(giver: Character, recipient: Character): Promise<Stored> {
    const [now, there] = await Promise.all([characters.findById(giver.id), characters.findById(recipient.id)]);
    if (now === undefined || there === undefined) {
      throw new Error('A character is gone');
    }
    return { giver: now, recipient: there };
  }

  async function auditedCommands(rowIds: readonly string[]): Promise<readonly string[]> {
    const rows = await database.db
      .select({ table: auditLog.tableName, command: auditLog.command })
      .from(auditLog)
      .where(and(eq(auditLog.action, 'update'), inArray(auditLog.rowId, [...rowIds])));
    return rows.map((row) => `${row.table}:${row.command}`).toSorted();
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

  /** A fresh campaign for each test, as offers are never deleted. */
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

  test('accepting moves the line, marks the offer accepted and writes both characters and the offer to the audit log', async () => {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, {}, rope);
    const recipient = await characterWith(ezren, {});
    const offer = await offerLine(giver, recipient, rope);

    await settlement.accept(ezren, campaignId, offer);

    const after = await stored(giver, recipient);
    const commands = await auditedCommands([giver.id, recipient.id, offer.id]);
    expect(after.giver.document.inventory.items).toStrictEqual([]);
    expect(after.recipient.document.inventory.items.map((each) => each.id)).toStrictEqual([rope]);
    expect(after.giver.version).toBe(nextVersion(giver.version));
    expect(after.recipient.version).toBe(nextVersion(recipient.version));
    expect(await statusOf(offer)).toBe(TransferStatus.Accepted);
    expect(commands).toStrictEqual([
      'campaign_item_transfers:accept-campaign-transfer',
      'characters:acceptTransfer',
      'characters:acceptTransfer',
    ]);
  });

  test('accepting moves the coins per denomination', async () => {
    const giver = await characterWith(amiri, { coins: CoinsSchema.parse({ gp: 10, cp: 3 }) });
    const recipient = await characterWith(ezren, { coins: CoinsSchema.parse({ gp: 1 }) });
    const offer = await offerCoins(giver, recipient, 4);

    await settlement.accept(ezren, campaignId, offer);

    const after = await stored(giver, recipient);
    expect(after.giver.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ gp: 6, cp: 3 }));
    expect(after.recipient.document.inventory.coins).toStrictEqual(CoinsSchema.parse({ gp: 5 }));
    expect(await statusOf(offer)).toBe(TransferStatus.Accepted);
  });

  test('a giver changed since the offer fails the whole accept with a version conflict', async () => {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, {}, rope);
    const recipient = await characterWith(ezren, {});
    const offer = await offerLine(giver, recipient, rope);
    await characters.update(giver.withInventory(giver.document.inventory, giver.updatedAt), giver.version, {
      actor: amiri,
      command: CharacterCommand.SetCoins,
    });

    const failed = await rejection(settlement.accept(ezren, campaignId, offer));

    const after = await stored(giver, recipient);
    expect(failed).toBeInstanceOf(VersionConflictError);
    expect(after.recipient.document.inventory.items).toStrictEqual([]);
    expect(after.recipient.version).toBe(recipient.version);
    expect(after.giver.document.inventory.items).toHaveLength(1);
    expect(await statusOf(offer)).toBe(TransferStatus.Pending);
  });

  test('a giver who no longer has the line is a conflict and nothing changes', async () => {
    const giver = await characterWith(amiri, {}, InventoryItemId.parse(newId()));
    const recipient = await characterWith(ezren, {});
    const offer = await offerLine(giver, recipient, InventoryItemId.parse(newId()));

    const failed = await rejection(settlement.accept(ezren, campaignId, offer));

    const after = await stored(giver, recipient);
    expect(failed).toBeInstanceOf(ConflictError);
    expect(JSON.stringify(failed)).toContain(ItemTransferMessage.LineGone);
    expect(await statusOf(offer)).toBe(TransferStatus.Pending);
    expect(after.giver.version).toBe(giver.version);
  });

  test('coins the giver no longer holds are a conflict and nothing changes', async () => {
    const giver = await characterWith(amiri, { coins: CoinsSchema.parse({ gp: 10 }) });
    const recipient = await characterWith(ezren, {});
    const offer = await offerCoins(giver, recipient, 99);

    const failed = await rejection(settlement.accept(ezren, campaignId, offer));

    const after = await stored(giver, recipient);
    expect(failed).toBeInstanceOf(ConflictError);
    expect(JSON.stringify(failed)).toContain(ItemTransferMessage.NotEnoughCoins);
    expect(await statusOf(offer)).toBe(TransferStatus.Pending);
    expect(after.recipient.document.inventory.coins).toStrictEqual(CoinsSchema.parse({}));
  });

  test('two accepts of one offer at once: the line moves once and the other is a conflict', async () => {
    const rope = InventoryItemId.parse(newId());
    const giver = await characterWith(amiri, {}, rope);
    const recipient = await characterWith(ezren, {});
    const offer = await offerLine(giver, recipient, rope);

    const results = await Promise.allSettled([
      settlement.accept(ezren, campaignId, offer),
      settlement.accept(ezren, campaignId, offer),
    ]);

    const refused = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    const after = await stored(giver, recipient);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(refused?.reason).toBeInstanceOf(ConflictError);
    expect(after.recipient.document.inventory.items).toHaveLength(1);
    expect(after.giver.document.inventory.items).toHaveLength(0);
  });

  test('two coin offers from one giver accepted at once: one wins, the other is a version conflict, coins are conserved', async () => {
    const giver = await characterWith(amiri, { coins: CoinsSchema.parse({ gp: 10 }) });
    const recipient = await characterWith(ezren, {});
    const first = await offerCoins(giver, recipient, 4);
    const second = await offerCoins(giver, recipient, 5);

    const results = await Promise.allSettled([
      settlement.accept(ezren, campaignId, first),
      settlement.accept(ezren, campaignId, second),
    ]);

    const refused = results.find((result): result is PromiseRejectedResult => result.status === 'rejected');
    const after = await stored(giver, recipient);
    const held = after.giver.document.inventory.coins;
    const received = after.recipient.document.inventory.coins;
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(refused?.reason).toBeInstanceOf(VersionConflictError);
    expect(held.gp + received.gp).toBe(10);
    expect(received.gp).toBeGreaterThan(0);
  });

  test('offers crossing between two characters at once settle without a deadlock', async () => {
    const rope = InventoryItemId.parse(newId());
    const other = InventoryItemId.parse(newId());
    const left = await characterWith(amiri, {}, rope);
    const right = await characterWith(ezren, {}, other);
    const there = await offerLine(left, right, rope);
    const back = await offerLine(right, left, other);

    const results = await Promise.allSettled([
      settlement.accept(ezren, campaignId, there),
      settlement.accept(amiri, campaignId, back),
    ]);

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    expect(failures.every((failure) => failure.reason instanceof VersionConflictError)).toBe(true);
    expect(results.filter((result) => result.status === 'fulfilled').length).toBeGreaterThanOrEqual(1);
  });
});
