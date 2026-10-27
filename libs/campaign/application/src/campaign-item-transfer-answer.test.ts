import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignCharacterId,
  CampaignMemberId,
  CharacterId,
  ItemTransferId,
  OfferedCoinsSchema,
  ReviewedItemId,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { Campaign } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import {
  ConflictError,
  fixedClock,
  newId,
  NotFoundError,
  Temporal,
  UserId,
  VersionConflictError,
} from '@pioneer/shared/kernel';
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
const seelah = CharacterId.parse(newId());
const longsword = ReviewedItemId.parse(newId());

function memberIdOf(campaign: Campaign, userId: UserId): CampaignMemberId {
  return CampaignMemberId.parse(campaign.members.find((each) => each.userId === userId)?.id);
}

describe('CampaignItemTransferService answering an offer', () => {
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
          .character({ id: seelah, ownerId: merisiel, name: 'Seelah' }),
        lines: new InMemoryTransferLines().hasLine(kyra, longsword).hasCoins(kyra, { gp: 10 }),
        settlement,
      },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(merisiel).build());
    const attachedAt = Temporal.Instant.from('2026-10-10T10:00:00Z');
    await party.attach(vaults.id, {
      id: CampaignCharacterId.parse(newId()),
      characterId: kyra,
      memberId: memberIdOf(vaults, ezren),
      attachedAt,
    });
    await party.attach(vaults.id, {
      id: CampaignCharacterId.parse(newId()),
      characterId: seelah,
      memberId: memberIdOf(vaults, merisiel),
      attachedAt,
    });
  });

  async function offered(): Promise<ItemTransferId> {
    const offer = await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });
    return offer.id;
  }

  test("the recipient's owner accepts, and the settlement moves the line", async () => {
    const id = await offered();

    const answer = await service.accept(merisiel, vaults.id, id);

    expect(answer).toStrictEqual({ id, status: TransferStatus.Accepted });
    expect(settlement.settled).toMatchObject([{ id, from: kyra, to: seelah }]);
    expect(await transfers.listPending(vaults.id)).toStrictEqual([]);
  });

  test('declining answers the offer and settles nothing', async () => {
    const id = await offered();

    const answer = await service.decline(merisiel, vaults.id, id);

    expect(answer).toStrictEqual({ id, status: TransferStatus.Declined });
    expect(settlement.settled).toStrictEqual([]);
    expect(await transfers.listPending(vaults.id)).toStrictEqual([]);
  });

  test('the giver, a stranger or the GM, who do not own the recipient, get a 404 and nothing moves', async () => {
    const id = await offered();

    const giver = await rejection(service.accept(ezren, vaults.id, id));
    const hidden = await rejection(service.accept(stranger, vaults.id, id));
    const gm = await rejection(service.decline(amiri, vaults.id, id));

    expect([giver, hidden, gm].every((error) => error instanceof NotFoundError)).toBe(true);
    expect(settlement.settled).toStrictEqual([]);
    expect(await transfers.listPending(vaults.id)).toHaveLength(1);
  });

  test('an offer that is not in the campaign is a 404', async () => {
    const unknown = ItemTransferId.parse(newId());
    const missing = await rejection(service.accept(merisiel, vaults.id, unknown));

    expect(missing).toBeInstanceOf(NotFoundError);
  });

  test('an answered offer cannot be answered again', async () => {
    const id = await offered();
    await service.decline(merisiel, vaults.id, id);

    const accepted = await rejection(service.accept(merisiel, vaults.id, id));
    const declined = await rejection(service.decline(merisiel, vaults.id, id));

    expect([accepted, declined].every((error) => error instanceof ConflictError)).toBe(true);
    expect(JSON.stringify(accepted)).toContain(ItemTransferMessage.NotPending);
    expect(settlement.settled).toStrictEqual([]);
  });

  test('a coin offer is accepted like an item offer', async () => {
    const coins = OfferedCoinsSchema.parse({ gp: 4 });
    const offer = await service.offerCoins(ezren, vaults.id, { from: kyra, to: seelah, coins });

    const answer = await service.accept(merisiel, vaults.id, offer.id);

    expect(answer.status).toBe(TransferStatus.Accepted);
    expect(settlement.settled).toMatchObject([{ id: offer.id, coins: { gp: 4 } }]);
  });

  test('a conflict from the settlement is passed on and the offer stays pending', async () => {
    const id = await offered();
    settlement.failWith(new VersionConflictError('Character', kyra));

    const failed = await rejection(service.accept(merisiel, vaults.id, id));

    expect(failed).toBeInstanceOf(VersionConflictError);
    expect(await transfers.listPending(vaults.id)).toHaveLength(1);
  });
});
