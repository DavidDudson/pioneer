import { beforeEach, describe, expect, test } from 'bun:test';

import { CampaignId, CampaignMemberId, CampaignName, CampaignRole } from '@pioneer/campaign/domain';
import type { Campaign, CampaignMember } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, ForbiddenError, newId, NotFoundError, UserId, VersionConflictError } from '@pioneer/shared/kernel';
import type { Clock, Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignService } from './campaign-service';
import { InMemoryCampaignInviteRepository } from './in-memory-campaign-invite-repository';
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
      {
        campaigns: new InMemoryCampaignRepository(),
        invites: new InMemoryCampaignInviteRepository(),
        directory: new InMemoryMemberDirectory(),
      },
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
    const service = new CampaignService(
      {
        campaigns: new InMemoryCampaignRepository(),
        invites: new InMemoryCampaignInviteRepository(),
        directory: new InMemoryMemberDirectory(),
      },
      clock,
    );
    await service.create(amiri, { name: vaults });
    await service.create(ezren, { name: CampaignName.parse('Kingmaker') });
    await service.create(amiri, { name: CampaignName.parse('Outlaws of Alkenstar') });
    const listed = await service.list(amiri);
    expect(listed.map((campaign) => campaign.name)).toStrictEqual([CampaignName.parse('Outlaws of Alkenstar'), vaults]);
  });

  test('a campaign the actor is not in reads as not found', async () => {
    const service = new CampaignService(
      {
        campaigns: new InMemoryCampaignRepository(),
        invites: new InMemoryCampaignInviteRepository(),
        directory: new InMemoryMemberDirectory(),
      },
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
    const service = new CampaignService(
      { campaigns, invites: new InMemoryCampaignInviteRepository(), directory },
      fixedClock('2026-10-10T10:00:00Z'),
    );
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
    const service = new CampaignService(
      { campaigns, invites: new InMemoryCampaignInviteRepository(), directory },
      fixedClock('2026-10-10T10:00:00Z'),
    );
    const party = new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(seelah).build();
    await campaigns.insert(party);

    const roster = await service.roster(seelah, party.id);
    expect(roster.viewerRole).toBe(CampaignRole.Player);
    expect(roster.members.map((member) => String(member.displayName))).toStrictEqual(['Amiri', 'Seelah']);
  });

  test('a campaign the actor is not in has no roster for them', async () => {
    const service = new CampaignService(
      {
        campaigns: new InMemoryCampaignRepository(),
        invites: new InMemoryCampaignInviteRepository(),
        directory: new InMemoryMemberDirectory(),
      },
      fixedClock('2026-10-10T10:00:00Z'),
    );
    const theirs = await service.create(ezren, { name: vaults });
    expect(await rejection(service.roster(amiri, theirs.id))).toBeInstanceOf(NotFoundError);
  });
});

function memberOf(campaign: Campaign, userId: UserId): CampaignMember {
  const member = campaign.members.find((candidate) => candidate.userId === userId);
  if (member === undefined) {
    throw new Error(`No member ${userId}`);
  }
  return member;
}

describe('CampaignService member management', () => {
  const seelah = UserId.parse(newId());
  let campaigns: InMemoryCampaignRepository;
  let service: CampaignService;
  let party: Campaign;

  beforeEach(async () => {
    campaigns = new InMemoryCampaignRepository();
    const directory = new InMemoryMemberDirectory().name(amiri, 'Amiri').name(ezren, 'Ezren').name(seelah, 'Seelah');
    service = new CampaignService(
      { campaigns, invites: new InMemoryCampaignInviteRepository(), directory },
      fixedClock('2026-10-10T10:00:00Z'),
    );
    party = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).withPlayer(seelah).build());
  });

  test('the GM removes a player, who then reads the campaign as not found', async () => {
    const roster = await service.removeMember(amiri, party.id, memberOf(party, ezren).id);
    expect(roster.members.map((member) => member.userId)).toStrictEqual([amiri, seelah]);
    expect(await rejection(service.get(ezren, party.id))).toBeInstanceOf(NotFoundError);
    // Again: no change, no error.
    const again = await service.removeMember(amiri, party.id, memberOf(party, ezren).id);
    expect(again.members).toHaveLength(2);
  });

  test('the GM can’t remove themselves', async () => {
    const error = await rejection(service.removeMember(amiri, party.id, memberOf(party, amiri).id));
    expect(error).toBeInstanceOf(ForbiddenError);
    expect((error as ForbiddenError).descriptor).toStrictEqual({ key: 'campaign.members.gmNotRemovable' });
  });

  test('a player may not remove or hand over; a stranger reads not found', async () => {
    const stranger = UserId.parse(newId());
    const seelahId = memberOf(party, seelah).id;
    expect(await rejection(service.removeMember(ezren, party.id, seelahId))).toBeInstanceOf(ForbiddenError);
    expect(await rejection(service.transferGm(ezren, party.id, { memberId: seelahId }))).toBeInstanceOf(ForbiddenError);
    expect(await rejection(service.removeMember(stranger, party.id, seelahId))).toBeInstanceOf(NotFoundError);
    expect(await rejection(service.leave(stranger, party.id))).toBeInstanceOf(NotFoundError);
  });

  test('the GM hands the role over and stays on as a player', async () => {
    const roster = await service.transferGm(amiri, party.id, { memberId: memberOf(party, ezren).id });
    expect(roster.viewerRole).toBe(CampaignRole.Player);
    const handed = await service.get(ezren, party.id);
    expect(handed.gmId).toBe(ezren);
    expect(handed.roleOf(amiri)).toBe(CampaignRole.Player);
    // The old GM no longer manages members.
    const seelahId = memberOf(party, seelah).id;
    expect(await rejection(service.removeMember(amiri, party.id, seelahId))).toBeInstanceOf(ForbiddenError);
  });

  test('handing the role to yourself changes nothing; to a stranger is not found', async () => {
    const roster = await service.transferGm(amiri, party.id, { memberId: memberOf(party, amiri).id });
    expect(roster.viewerRole).toBe(CampaignRole.Gm);
    const unchanged = await service.get(amiri, party.id);
    expect(unchanged.version).toBe(party.version);
    const unknown = { memberId: CampaignMemberId.parse(newId()) };
    expect(await rejection(service.transferGm(amiri, party.id, unknown))).toBeInstanceOf(NotFoundError);
  });

  test('a player leaves; the GM must hand the role over first', async () => {
    await service.leave(ezren, party.id);
    expect(await rejection(service.get(ezren, party.id))).toBeInstanceOf(NotFoundError);
    const error = await rejection(service.leave(amiri, party.id));
    expect(error).toBeInstanceOf(ForbiddenError);
    expect((error as ForbiddenError).descriptor).toStrictEqual({ key: 'campaign.members.gmCannotLeave' });
  });

  test('a change made from a stale read is a version conflict', async () => {
    await campaigns.updateMembers(party.withoutMember(memberOf(party, seelah).id), party.version);
    const stale = party.withoutMember(memberOf(party, ezren).id);
    expect(await rejection(campaigns.updateMembers(stale, party.version))).toBeInstanceOf(VersionConflictError);
  });
});
