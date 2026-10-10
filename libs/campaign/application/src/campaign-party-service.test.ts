import { beforeEach, describe, expect, test } from 'bun:test';

import { CharacterId } from '@pioneer/campaign/domain';
import type { Campaign, CampaignMember, CampaignParty } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { ConflictError, ForbiddenError, newId, NotFoundError, Temporal, UserId } from '@pioneer/shared/kernel';
import type { Clock } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignPartyService } from './campaign-party-service';
import { InMemoryCampaignPartyRepository } from './in-memory-campaign-party-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCharacterDirectory } from './in-memory-character-directory';
import { InMemoryMemberDirectory } from './in-memory-member-directory';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const seelah = UserId.parse(newId());
const stranger = UserId.parse(newId());

const valeros = CharacterId.parse(newId());
const merisiel = CharacterId.parse(newId());
const kyra = CharacterId.parse(newId());
const lem = CharacterId.parse(newId());

/** A clock a minute on at each reading, so attachment order is visible. */
function ticking(start: string): Clock {
  let next = Temporal.Instant.from(start);
  return {
    now: (): Temporal.Instant => {
      const reading = next;
      next = next.add({ minutes: 1 });
      return reading;
    },
  };
}

function memberOf(campaign: Campaign, userId: UserId): CampaignMember {
  const member = campaign.members.find((candidate) => candidate.userId === userId);
  if (member === undefined) {
    throw new Error(`No member ${userId}`);
  }
  return member;
}

/** The party's character names, in order, as plain strings. */
function names(party: CampaignParty): readonly string[] {
  return party.characters.map((character) => String(character.name));
}

/** The picker's character names, in order, as plain strings. */
function attachable(party: CampaignParty): readonly string[] {
  return party.attachable.map((character) => String(character.name));
}

describe('CampaignPartyService', () => {
  let campaigns: InMemoryCampaignRepository;
  let service: CampaignPartyService;
  let vaults: Campaign;
  let kingmaker: Campaign;

  beforeEach(async () => {
    campaigns = new InMemoryCampaignRepository();
    const characters = new InMemoryCharacterDirectory()
      .character({ id: valeros, ownerId: ezren, name: 'Valeros', level: 3 })
      .character({ id: merisiel, ownerId: ezren, name: 'Merisiel' })
      .character({ id: kyra, ownerId: seelah, name: 'Kyra' })
      .character({ id: lem, ownerId: stranger, name: 'Lem' });
    const directory = new InMemoryMemberDirectory()
      .name(amiri, 'Amiri')
      .name(ezren, 'Ezren')
      .name(seelah, 'Seelah')
      .name(stranger, 'Lem’s player');
    service = new CampaignPartyService(
      { campaigns, party: new InMemoryCampaignPartyRepository(campaigns), characters, directory },
      ticking('2026-10-10T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(seelah).build());
    kingmaker = await campaigns.insert(new CampaignBuilder().named('Kingmaker').ranBy(amiri).withPlayer(ezren).build());
  });

  test('a new campaign has no party, and offers the actor every character of theirs by name', async () => {
    const party = await service.party(ezren, vaults.id);
    expect(party.characters).toStrictEqual([]);
    expect(attachable(party)).toStrictEqual(['Merisiel', 'Valeros']);
  });

  test('a member attaches their character, which joins the party and leaves the picker', async () => {
    const party = await service.attach(ezren, vaults.id, { characterId: valeros });
    expect(names(party)).toStrictEqual(['Valeros']);
    expect(Number(party.characters[0]?.level)).toBe(3);
    expect(String(party.characters[0]?.ownerName)).toBe('Ezren');
    expect(party.characters[0]?.ownerId).toBe(ezren);
    expect(party.characters[0]?.attachedAt.toString()).toBe('2026-10-10T10:00:00Z');
    expect(party.characters[0]?.detachable).toBe(true);
    expect(attachable(party)).toStrictEqual(['Merisiel']);
  });

  test('every member sees the party; only the owner and the GM may detach', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    await service.attach(seelah, vaults.id, { characterId: kyra });

    const asSeelah = await service.party(seelah, vaults.id);
    expect(names(asSeelah)).toStrictEqual(['Valeros', 'Kyra']);
    expect(asSeelah.characters.map((character) => character.detachable)).toStrictEqual([false, true]);
    expect(attachable(asSeelah)).toStrictEqual([]);

    const asGm = await service.party(amiri, vaults.id);
    expect(asGm.characters.map((character) => character.detachable)).toStrictEqual([true, true]);
  });

  test('attaching twice is no change', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    const again = await service.attach(ezren, vaults.id, { characterId: valeros });
    expect(names(again)).toStrictEqual(['Valeros']);
  });

  test('a character already in another campaign is a conflict, with its reason', async () => {
    await service.attach(ezren, kingmaker.id, { characterId: valeros });
    const error = await rejection(service.attach(ezren, vaults.id, { characterId: valeros }));
    expect(error).toBeInstanceOf(ConflictError);
    expect((error as ConflictError).descriptor).toStrictEqual({ key: 'campaign.party.inOtherCampaign' });
    // Nor does the picker offer it.
    const party = await service.party(ezren, vaults.id);
    expect(attachable(party)).toStrictEqual(['Merisiel']);
  });

  test('another user’s character, or a missing one, is not found; the GM included', async () => {
    const missing = CharacterId.parse(newId());
    const errors = await Promise.all(
      [kyra, lem, missing].map(async (characterId) => rejection(service.attach(ezren, vaults.id, { characterId }))),
    );
    for (const error of errors) {
      expect(error).toBeInstanceOf(NotFoundError);
    }
    expect(await rejection(service.attach(amiri, vaults.id, { characterId: valeros }))).toBeInstanceOf(NotFoundError);
  });

  test('a stranger reads the campaign as not found, whatever they ask', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    expect(await rejection(service.party(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
    expect(await rejection(service.attach(stranger, vaults.id, { characterId: lem }))).toBeInstanceOf(NotFoundError);
    expect(await rejection(service.detach(stranger, vaults.id, valeros))).toBeInstanceOf(NotFoundError);
  });

  test('the owner detaches their character, which the picker offers again; twice is no change', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    const party = await service.detach(ezren, vaults.id, valeros);
    expect(party.characters).toStrictEqual([]);
    expect(attachable(party)).toStrictEqual(['Merisiel', 'Valeros']);
    const again = await service.detach(ezren, vaults.id, valeros);
    expect(again.characters).toStrictEqual([]);
  });

  test('the GM detaches a player’s character', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    const party = await service.detach(amiri, vaults.id, valeros);
    expect(party.characters).toStrictEqual([]);
  });

  test('a player may not detach another player’s character', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    expect(await rejection(service.detach(seelah, vaults.id, valeros))).toBeInstanceOf(ForbiddenError);
    expect(names(await service.party(ezren, vaults.id))).toStrictEqual(['Valeros']);
  });

  test('detaching from the wrong campaign leaves the character where it is', async () => {
    await service.attach(ezren, kingmaker.id, { characterId: valeros });
    const party = await service.detach(amiri, vaults.id, valeros);
    expect(party.characters).toStrictEqual([]);
    expect(names(await service.party(ezren, kingmaker.id))).toStrictEqual(['Valeros']);
  });

  test('a member who has left takes their characters out of the party', async () => {
    await service.attach(ezren, vaults.id, { characterId: valeros });
    await service.attach(seelah, vaults.id, { characterId: kyra });
    await campaigns.updateMembers(vaults.withoutMember(memberOf(vaults, ezren).id), vaults.version);

    const party = await service.party(amiri, vaults.id);
    expect(names(party)).toStrictEqual(['Kyra']);
    // Free again, so they can bring it into another of their campaigns.
    const elsewhere = await service.attach(ezren, kingmaker.id, { characterId: valeros });
    expect(names(elsewhere)).toStrictEqual(['Valeros']);
  });
});
