import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignCharacterId,
  CampaignMemberId,
  CharacterId,
  ItemTransferId,
  ReviewedItemId,
  TransferStatus,
} from '@pioneer/campaign/domain';
import type { Campaign } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { ConflictError, fixedClock, newId, NotFoundError, Temporal, UserId } from '@pioneer/shared/kernel';
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

describe('CampaignItemTransferService withdrawing an offer', () => {
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
        lines: new InMemoryTransferLines().hasLine(kyra, longsword),
        settlement,
      },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(merisiel).build());
    const attachedAt = Temporal.Instant.from('2026-10-10T10:00:00Z');
    await Promise.all(
      [
        { characterId: kyra, owner: ezren },
        { characterId: seelah, owner: merisiel },
      ].map(async ({ characterId, owner }) =>
        party.attach(vaults.id, {
          id: CampaignCharacterId.parse(newId()),
          characterId,
          memberId: memberIdOf(vaults, owner),
          attachedAt,
        }),
      ),
    );
  });

  async function offered(): Promise<ItemTransferId> {
    const offer = await service.offer(ezren, vaults.id, { from: kyra, to: seelah, item: longsword });
    return offer.id;
  }

  async function statusOf(id: ItemTransferId): Promise<string | undefined> {
    const found = await transfers.findById(vaults.id, id);
    return found?.status;
  }

  test("the giver's owner withdraws a pending offer, and nothing is settled", async () => {
    const id = await offered();

    const answer = await service.withdraw(ezren, vaults.id, id);

    expect(answer).toStrictEqual({ id, status: TransferStatus.Withdrawn });
    expect(settlement.settled).toStrictEqual([]);
    expect(await transfers.listPending(vaults.id)).toStrictEqual([]);
    expect(await statusOf(id)).toBe(TransferStatus.Withdrawn);
  });

  test('withdrawing twice is a no-op that answers the same and writes once', async () => {
    const id = await offered();
    await service.withdraw(ezren, vaults.id, id);
    const written = transfers.actors.length;

    const again = await service.withdraw(ezren, vaults.id, id);

    expect(again).toStrictEqual({ id, status: TransferStatus.Withdrawn });
    expect(transfers.actors).toHaveLength(written);
  });

  test('the recipient, a stranger or the GM, who do not own the giver, get a 404 and the offer stays pending', async () => {
    const id = await offered();

    const errors = await Promise.all(
      [merisiel, stranger, amiri].map(async (user) => rejection(service.withdraw(user, vaults.id, id))),
    );

    expect(errors.every((error) => error instanceof NotFoundError)).toBe(true);
    expect(await transfers.listPending(vaults.id)).toHaveLength(1);
  });

  test('an offer that is not in the campaign is a 404', async () => {
    const unknown = ItemTransferId.parse(newId());
    const missing = await rejection(service.withdraw(ezren, vaults.id, unknown));

    expect(missing).toBeInstanceOf(NotFoundError);
  });

  test('an accepted offer cannot be withdrawn: a 409 that says the recipient answered', async () => {
    const id = await offered();
    await service.accept(merisiel, vaults.id, id);

    const failed = await rejection(service.withdraw(ezren, vaults.id, id));

    expect(failed).toBeInstanceOf(ConflictError);
    expect(JSON.stringify(failed)).toContain(ItemTransferMessage.AlreadyAnswered);
    expect(await statusOf(id)).toBe(TransferStatus.Accepted);
  });

  test('a declined offer cannot be withdrawn', async () => {
    const id = await offered();
    await service.decline(merisiel, vaults.id, id);

    const failed = await rejection(service.withdraw(ezren, vaults.id, id));

    expect(failed).toBeInstanceOf(ConflictError);
    expect(await statusOf(id)).toBe(TransferStatus.Declined);
  });

  test('a withdrawn offer cannot be accepted or declined: the existing already-answered 409', async () => {
    const id = await offered();
    await service.withdraw(ezren, vaults.id, id);

    const accepted = await rejection(service.accept(merisiel, vaults.id, id));
    const declined = await rejection(service.decline(merisiel, vaults.id, id));

    expect([accepted, declined].every((error) => error instanceof ConflictError)).toBe(true);
    expect(JSON.stringify(accepted)).toContain(ItemTransferMessage.NotPending);
    expect(settlement.settled).toStrictEqual([]);
  });

  test('a withdrawn line can be offered again', async () => {
    const id = await offered();
    await service.withdraw(ezren, vaults.id, id);

    const second = await offered();

    expect(second).not.toBe(id);
  });
});
