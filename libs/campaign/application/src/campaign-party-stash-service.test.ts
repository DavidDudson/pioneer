import { beforeEach, describe, expect, test } from 'bun:test';

import {
  CampaignCharacterId,
  CampaignMemberId,
  CharacterId,
  PartyStashQuantity,
  ReviewedItemId,
  ReviewedName,
} from '@pioneer/campaign/domain';
import type { Campaign, CampaignId, PartyStashLine } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { newId, NotFoundError, Temporal, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignPartyStashService } from './campaign-party-stash-service';
import { InMemoryCampaignPartyRepository } from './in-memory-campaign-party-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCharacterDirectory } from './in-memory-character-directory';
import { InMemoryPartyStashKeeper } from './in-memory-party-stash-keeper';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const merisiel = UserId.parse(newId());
const stranger = UserId.parse(newId());
const kyra = CharacterId.parse(newId());
const seelah = CharacterId.parse(newId());
const outsider = CharacterId.parse(newId());
const dormant = CharacterId.parse(newId());

function line(name: string): PartyStashLine {
  return {
    id: ReviewedItemId.parse(newId()),
    name: ReviewedName.parse(name),
    quantity: PartyStashQuantity.parse(1),
  };
}

const rope = line('Rope');
const backpack = line('Backpack');
const sword = line('Longsword');

function memberIdOf(campaign: Campaign, userId: UserId): CampaignMemberId {
  return CampaignMemberId.parse(campaign.members.find((each) => each.userId === userId)?.id);
}

describe('CampaignPartyStashService', () => {
  let keeper: InMemoryPartyStashKeeper;
  let service: CampaignPartyStashService;
  let vaults: Campaign;

  beforeEach(async () => {
    const campaigns = new InMemoryCampaignRepository();
    const party = new InMemoryCampaignPartyRepository(campaigns);
    keeper = new InMemoryPartyStashKeeper().stashHolds(rope).stashHolds(backpack).characterHolds(kyra, sword);
    service = new CampaignPartyStashService({
      campaigns,
      party,
      characters: new InMemoryCharacterDirectory()
        .character({ id: kyra, ownerId: ezren, name: 'Kyra' })
        .character({ id: seelah, ownerId: merisiel, name: 'Seelah' })
        .character({ id: outsider, ownerId: stranger, name: 'Outsider' })
        .character({ id: dormant, ownerId: ezren, name: 'Dormant', archived: true }),
      stash: keeper,
    });
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
    await attach(seelah, merisiel);
    await attach(dormant, ezren);
  });

  test('every member reads what the party holds', async () => {
    const seen = await service.view(merisiel, vaults.id);

    expect(seen.lines).toStrictEqual([rope, backpack]);
  });

  test('the view lists only the viewer own live characters of the party', async () => {
    const seen = await service.view(ezren, vaults.id);

    expect(seen.characters.map((each) => each.characterId)).toStrictEqual([kyra]);
  });

  test('a campaign the actor is not in is a 404', async () => {
    const hidden = await rejection(service.view(stranger, vaults.id));

    expect(hidden).toBeInstanceOf(NotFoundError);
  });

  test('a member puts a line of their character into the stash', async () => {
    const after = await service.deposit(ezren, vaults.id, { from: kyra, item: sword.id });

    expect(after.lines.map((each) => each.id)).toStrictEqual([rope.id, backpack.id, sword.id]);
    expect(keeper.moves).toMatchObject([{ character: kyra, item: sword.id, direction: 'deposit' }]);
  });

  test('a character that is not theirs, outside the party or archived cannot deposit (404)', async () => {
    const notTheirs = await rejection(service.deposit(merisiel, vaults.id, { from: kyra, item: sword.id }));
    const notInParty = await rejection(service.deposit(stranger, vaults.id, { from: outsider, item: sword.id }));
    const archived = await rejection(service.deposit(ezren, vaults.id, { from: dormant, item: sword.id }));

    expect([notTheirs, notInParty, archived].every((error) => error instanceof NotFoundError)).toBe(true);
    expect(keeper.moves).toStrictEqual([]);
  });

  test('any member takes any line from the stash into their character, with no lock', async () => {
    const after = await service.take(merisiel, vaults.id, { to: seelah, item: backpack.id });

    expect(after.lines).toStrictEqual([rope]);
    expect(keeper.moves).toMatchObject([{ character: seelah, item: backpack.id, direction: 'take' }]);
  });

  test('taking into a character that is not theirs, or a line the stash lacks, is a 404', async () => {
    const notTheirs = await rejection(service.take(merisiel, vaults.id, { to: kyra, item: rope.id }));
    const missing = await rejection(service.take(ezren, vaults.id, { to: kyra, item: sword.id }));

    expect([notTheirs, missing].every((error) => error instanceof NotFoundError)).toBe(true);
  });
});
