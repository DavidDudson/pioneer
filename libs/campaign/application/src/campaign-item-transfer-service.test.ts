import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignCharacterId,
  CampaignMemberId,
  CharacterId,
  OfferedCoinsSchema,
  PartyCharacterName,
  ReviewedItemId,
  ReviewedName,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { Campaign, CampaignId } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { ConflictError, fixedClock, newId, NotFoundError, Temporal, UserId, Version } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignItemTransferService } from './campaign-item-transfer-service';
import { InMemoryCampaignPartyRepository } from './in-memory-campaign-party-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCharacterDirectory } from './in-memory-character-directory';
import { InMemoryItemTransferRepository } from './in-memory-item-transfer-repository';
import { InMemoryTransferLines } from './in-memory-transfer-lines';
import { InMemoryTransferSettlement } from './in-memory-transfer-settlement';
import { ItemTransferMessage } from './item-transfer-message';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const merisiel = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const mordred = CharacterId.parse(newId());
const seelah = CharacterId.parse(newId());
const outsider = CharacterId.parse(newId());
const dormant = CharacterId.parse(newId());
const longsword = ReviewedItemId.parse(newId());
const caliburn = ReviewedItemId.parse(newId());
const dagger = ReviewedItemId.parse(newId());
const GIVER_VERSION = Version.parse(7);

function memberIdOf(campaign: Campaign, userId: UserId): CampaignMemberId {
  return CampaignMemberId.parse(campaign.members.find((each) => each.userId === userId)?.id);
}

describe('CampaignItemTransferService', () => {
  let transfers: InMemoryItemTransferRepository;
  let settlement: InMemoryTransferSettlement;
  let service: CampaignItemTransferService;
  let vaults: Campaign;

  beforeEach(async () => {
    const campaigns = new InMemoryCampaignRepository();
    const party = new InMemoryCampaignPartyRepository(campaigns);
    transfers = new InMemoryItemTransferRepository();
    settlement = new InMemoryTransferSettlement(transfers);
    service = new CampaignItemTransferService(
      {
        campaigns,
        transfers,
        party,
        characters: new InMemoryCharacterDirectory()
          .character({ id: kyra, ownerId: ezren, name: 'Kyra' })
          .character({ id: mordred, ownerId: ezren, name: 'Mordred' })
          .character({ id: seelah, ownerId: merisiel, name: 'Seelah' })
          .character({ id: outsider, ownerId: stranger, name: 'Outsider' })
          .character({ id: dormant, ownerId: ezren, name: 'Dormant', archived: true }),
        lines: new InMemoryTransferLines()
          .hasLine(kyra, longsword, { version: GIVER_VERSION, name: ReviewedName.parse('Longsword') })
          .hasLine(kyra, caliburn, { keyItem: true })
          .hasLine(dormant, dagger, { version: GIVER_VERSION })
          .hasCoins(kyra, { gp: 10, sp: 5 }, GIVER_VERSION)
          .hasCoins(dormant, { gp: 1 }, GIVER_VERSION),
        settlement,
      },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(merisiel).build());
    const attachedAt = Temporal.Instant.from('2026-10-10T10:00:00Z');
    const attach = async (characterId: CharacterId, owner: UserId): Promise<CampaignId | undefined> =>
      party.attach(vaults.id, {
        id: CampaignCharacterId.parse(newId()),
        characterId,
        memberId: memberIdOf(vaults, owner),
        attachedAt,
      });
    await attach(kyra, ezren);
    await attach(mordred, ezren);
    await attach(dormant, ezren);
    await attach(seelah, merisiel);
  });

  test('a member offers a line of their character to another character, and it is pending', async () => {
    const offer = await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });

    expect(offer).toMatchObject({ from: kyra, to: seelah, item: longsword, status: TransferStatus.Pending });
    expect(await transfers.listPending(vaults.id)).toMatchObject([
      { id: offer.id, giverVersion: GIVER_VERSION, createdAt: Temporal.Instant.from('2026-10-17T10:00:00Z') },
    ]);
    expect(transfers.actors).toStrictEqual([ezren]);
  });

  test('a character of the same member can be the recipient', async () => {
    const offer = await service.offer(ezren, vaults.id, { from: kyra, to: mordred, item: longsword });

    expect(offer.to).toBe(mordred);
  });

  test('a campaign the actor is not in, a giver that is not theirs, or a character outside the party is a 404', async () => {
    const hidden = await rejection(service.offer(stranger, vaults.id, { from: outsider, to: kyra, item: longsword }));
    const notTheirs = await rejection(service.offer(merisiel, vaults.id, { from: kyra, to: seelah, item: longsword }));
    const notInParty = await rejection(service.offer(ezren, vaults.id, { from: kyra, to: outsider, item: longsword }));

    expect([hidden, notTheirs, notInParty].every((error) => error instanceof NotFoundError)).toBe(true);
    expect(await transfers.listPending(vaults.id)).toStrictEqual([]);
  });

  test('an archived giver is a 404 (ADR-0062)', async () => {
    const archived = await rejection(service.offer(ezren, vaults.id, { from: dormant, to: seelah, item: dagger }));

    expect(archived).toBeInstanceOf(NotFoundError);
    expect(await transfers.listPending(vaults.id)).toStrictEqual([]);
  });

  test('a line the giver does not have is a 404', async () => {
    const unknown = ReviewedItemId.parse(newId());

    const missing = await rejection(service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: unknown }));

    expect(missing).toBeInstanceOf(NotFoundError);
  });

  test("a key item's line is refused with its message key, not given away", async () => {
    const refused = await rejection(service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: caliburn }));

    expect(refused).toBeInstanceOf(ConflictError);
    expect(JSON.stringify(refused)).toContain(ItemTransferMessage.KeyItemLine);
    expect(await transfers.listPending(vaults.id)).toStrictEqual([]);
  });

  test('a line already on offer is refused, even to someone else', async () => {
    await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });

    const again = await rejection(service.offer(ezren, vaults.id, { from: kyra, to: mordred, item: longsword }));

    expect(again).toBeInstanceOf(ConflictError);
    expect(JSON.stringify(again)).toContain(ItemTransferMessage.AlreadyOffered);
    expect(await transfers.listPending(vaults.id)).toHaveLength(1);
  });

  test('a character cannot offer to itself', async () => {
    const same = await rejection(service.offer(ezren, vaults.id, { from: kyra, to: kyra, item: longsword }));

    expect(same).toBeInstanceOf(ConflictError);
    expect(JSON.stringify(same)).toContain(ItemTransferMessage.SameCharacter);
  });

  describe('coins', () => {
    const gold = OfferedCoinsSchema.parse({ gp: 4 });

    test('a member offers coins of their character to another character, and it is pending', async () => {
      const offer = await service.offerCoins(ezren, vaults.id, { from: kyra, to: seelah, coins: gold });

      expect(offer).toMatchObject({ from: kyra, to: seelah, coins: gold, status: TransferStatus.Pending });
      expect(transfers.coinOffers).toMatchObject([
        {
          id: offer.id,
          coins: gold,
          giverVersion: GIVER_VERSION,
          createdAt: Temporal.Instant.from('2026-10-17T10:00:00Z'),
        },
      ]);
      expect(transfers.actors).toStrictEqual([ezren]);
    });

    test('the whole purse can be offered, and offers may pile up', async () => {
      const all = OfferedCoinsSchema.parse({ gp: 10, sp: 5 });

      await service.offerCoins(ezren, vaults.id, { from: kyra, to: seelah, coins: all });
      await service.offerCoins(ezren, vaults.id, { from: kyra, to: mordred, coins: all });

      expect(transfers.coinOffers).toHaveLength(2);
    });

    test('more of any denomination than the giver holds is refused with its message key', async () => {
      const tooMuch = [{ gp: 11 }, { sp: 6 }, { pp: 1 }, { cp: 1 }].map(async (coins) =>
        rejection(
          service.offerCoins(ezren, vaults.id, { from: kyra, to: seelah, coins: OfferedCoinsSchema.parse(coins) }),
        ),
      );

      const refused = await Promise.all(tooMuch);

      expect(refused.every((error) => error instanceof ConflictError)).toBe(true);
      expect(JSON.stringify(refused[0])).toContain(ItemTransferMessage.NotEnoughCoins);
      expect(transfers.coinOffers).toStrictEqual([]);
    });

    test('a campaign the actor is not in, a giver that is not theirs, an archived giver, or a character outside the party is a 404', async () => {
      const hidden = await rejection(
        service.offerCoins(stranger, vaults.id, { from: outsider, to: kyra, coins: gold }),
      );
      const notTheirs = await rejection(
        service.offerCoins(merisiel, vaults.id, { from: kyra, to: seelah, coins: gold }),
      );
      const notInParty = await rejection(
        service.offerCoins(ezren, vaults.id, { from: kyra, to: outsider, coins: gold }),
      );
      const archived = await rejection(
        service.offerCoins(ezren, vaults.id, { from: dormant, to: seelah, coins: OfferedCoinsSchema.parse({ gp: 1 }) }),
      );

      expect([hidden, notTheirs, notInParty, archived].every((error) => error instanceof NotFoundError)).toBe(true);
      expect(transfers.coinOffers).toStrictEqual([]);
    });

    test('a character cannot offer coins to itself', async () => {
      const same = await rejection(service.offerCoins(ezren, vaults.id, { from: kyra, to: kyra, coins: gold }));

      expect(same).toBeInstanceOf(ConflictError);
      expect(JSON.stringify(same)).toContain(ItemTransferMessage.SameCharacter);
    });
  });

  describe('list', () => {
    test("shows the giver's owner and the recipient's owner the pending offer, with names", async () => {
      const offer = await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });
      const shared = {
        id: offer.id,
        from: kyra,
        fromName: PartyCharacterName.parse('Kyra'),
        to: seelah,
        toName: PartyCharacterName.parse('Seelah'),
        kind: 'item' as const,
        item: longsword,
        itemName: ReviewedName.parse('Longsword'),
      };

      expect(await service.list(ezren, vaults.id)).toStrictEqual([{ ...shared, asGiver: true, asRecipient: false }]);
      expect(await service.list(merisiel, vaults.id)).toStrictEqual([{ ...shared, asGiver: false, asRecipient: true }]);
    });

    test('shows a coin offer beside an item one, oldest first, with its coins', async () => {
      const item = await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });
      const coins = OfferedCoinsSchema.parse({ gp: 4, sp: 2 });
      const purse = await service.offerCoins(ezren, vaults.id, { from: kyra, to: seelah, coins });

      const listed = await service.list(merisiel, vaults.id);

      expect(listed.map((each) => each.id)).toStrictEqual([item.id, purse.id]);
      expect(listed[1]).toStrictEqual({
        id: purse.id,
        kind: 'coins',
        from: kyra,
        fromName: PartyCharacterName.parse('Kyra'),
        to: seelah,
        toName: PartyCharacterName.parse('Seelah'),
        coins,
        asGiver: false,
        asRecipient: true,
      });
    });

    test('hides an offer between other members, and offers that are no longer pending', async () => {
      const offer = await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });
      await service.withdraw(ezren, vaults.id, offer.id);

      expect(await service.list(ezren, vaults.id)).toStrictEqual([]);
      expect(await service.list(amiri, vaults.id)).toStrictEqual([]);
    });

    test('is a 404 for someone outside the campaign', async () => {
      expect(await rejection(service.list(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
    });
  });
});
