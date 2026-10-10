import { beforeEach, describe, expect, test } from 'bun:test';

import { CampaignId, CampaignName, CampaignRole } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import type { Clock, Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignService } from './campaign-service';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryMemberDirectory } from './in-memory-member-directory';

const vaults = CampaignName.parse('Abomination Vaults');
const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());

/** A clock that reads each instant in turn, so creation order is visible. */
function ticking(...instants: readonly string[]): Clock {
  const queue = instants.map((instant) => fixedClock(instant).now());
  return {
    now: (): Temporal.Instant => {
      const next = queue.shift();
      if (next === undefined) {
        throw new Error('Clock ran out of instants');
      }
      return next;
    },
  };
}

describe('CampaignService', () => {
  let service: CampaignService;

  beforeEach(() => {
    service = new CampaignService(
      new InMemoryCampaignRepository(),
      new InMemoryMemberDirectory(),
      fixedClock('2026-10-10T10:00:00Z'),
    );
  });

  test('create assigns a UUIDv4 id and makes the actor the GM and its only member', async () => {
    const created = await service.create(amiri, { name: vaults });
    expect(created.id[14]).toBe('4');
    expect(created.gmId).toBe(amiri);
    expect(created.members.map((member) => [member.userId, member.role])).toStrictEqual([[amiri, CampaignRole.Gm]]);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
  });

  test('missing campaign is not found', async () => {
    const missing = CampaignId.parse(newId());
    const error = await rejection(service.get(amiri, missing));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });
});

describe('CampaignService membership', () => {
  test('list holds only the actor’s campaigns, oldest first', async () => {
    // Created newest first, so the order comes from the join times, not insertion.
    const clock = ticking('2026-10-10T12:00:00Z', '2026-10-10T11:00:00Z', '2026-10-10T10:00:00Z');
    const service = new CampaignService(new InMemoryCampaignRepository(), new InMemoryMemberDirectory(), clock);
    await service.create(amiri, { name: vaults });
    await service.create(ezren, { name: CampaignName.parse('Kingmaker') });
    await service.create(amiri, { name: CampaignName.parse('Outlaws of Alkenstar') });
    const listed = await service.list(amiri);
    expect(listed.map((campaign) => campaign.name)).toStrictEqual([CampaignName.parse('Outlaws of Alkenstar'), vaults]);
  });

  test('a campaign the actor is not in reads as not found', async () => {
    const service = new CampaignService(
      new InMemoryCampaignRepository(),
      new InMemoryMemberDirectory(),
      fixedClock('2026-10-10T10:00:00Z'),
    );
    const theirs = await service.create(ezren, { name: vaults });
    const error = await rejection(service.get(amiri, theirs.id));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });
});

describe('CampaignService roster', () => {
  test('names each member and says the actor’s role', async () => {
    const campaigns = new InMemoryCampaignRepository();
    const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren');
    const service = new CampaignService(campaigns, directory, fixedClock('2026-10-10T10:00:00Z'));
    const created = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());

    const roster = await service.roster(ezren, created.id);
    expect(roster.viewerRole).toBe(CampaignRole.Player);
    expect(roster.members.map((member) => [String(member.displayName), member.role])).toStrictEqual([
      ['Amiri', CampaignRole.Gm],
      ['Ezren', CampaignRole.Player],
    ]);
    const asGm = await service.roster(amiri, created.id);
    expect(asGm.viewerRole).toBe(CampaignRole.Gm);
  });

  test('leaves out a member whose account is gone, keeping the order', async () => {
    const campaigns = new InMemoryCampaignRepository();
    const seelah = UserId.parse(newId());
    const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(seelah, 'Seelah');
    const service = new CampaignService(campaigns, directory, fixedClock('2026-10-10T10:00:00Z'));
    const party = new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(seelah).build();
    await campaigns.insert(party);

    const roster = await service.roster(seelah, party.id);
    expect(roster.viewerRole).toBe(CampaignRole.Player);
    expect(roster.members.map((member) => String(member.displayName))).toStrictEqual(['Amiri', 'Seelah']);
  });

  test('a campaign the actor is not in has no roster for them', async () => {
    const service = new CampaignService(
      new InMemoryCampaignRepository(),
      new InMemoryMemberDirectory(),
      fixedClock('2026-10-10T10:00:00Z'),
    );
    const theirs = await service.create(ezren, { name: vaults });
    expect(await rejection(service.roster(amiri, theirs.id))).toBeInstanceOf(NotFoundError);
  });
});
