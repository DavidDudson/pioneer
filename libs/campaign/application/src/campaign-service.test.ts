import { beforeEach, describe, expect, test } from 'bun:test';

import { CampaignId, CampaignName, CampaignRole } from '@pioneer/campaign/domain';
import { fixedClock, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import type { Clock, Temporal } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignService } from './campaign-service';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';

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
    service = new CampaignService(new InMemoryCampaignRepository(), fixedClock('2026-10-10T10:00:00Z'));
  });

  test('create makes the actor the GM and its only member', async () => {
    const created = await service.create(amiri, { name: vaults });
    expect(created.id[14]).toBe('4');
    expect(created.gmId).toBe(amiri);
    expect(created.members.map((member) => [member.userId, member.role])).toStrictEqual([[amiri, CampaignRole.Gm]]);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
  });

  test('missing campaign is not found', async () => {
    const error = await rejection(service.get(amiri, CampaignId.parse(newId())));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });
});

describe('CampaignService membership', () => {
  test('list holds only the actor’s campaigns, oldest first', async () => {
    const clock = ticking('2026-10-10T10:00:00Z', '2026-10-10T11:00:00Z', '2026-10-10T12:00:00Z');
    const service = new CampaignService(new InMemoryCampaignRepository(), clock);
    await service.create(amiri, { name: vaults });
    await service.create(ezren, { name: CampaignName.parse('Kingmaker') });
    await service.create(amiri, { name: CampaignName.parse('Outlaws of Alkenstar') });
    const listed = await service.list(amiri);
    expect(listed.map((campaign) => campaign.name)).toStrictEqual([vaults, 'Outlaws of Alkenstar']);
  });

  test('a campaign the actor is not in reads as not found', async () => {
    const service = new CampaignService(new InMemoryCampaignRepository(), fixedClock('2026-10-10T10:00:00Z'));
    const theirs = await service.create(ezren, { name: vaults });
    const error = await rejection(service.get(amiri, theirs.id));
    expect(error).toBeInstanceOf(NotFoundError);
    expect((error as NotFoundError).descriptor).toStrictEqual({ key: 'problem.notFound' });
  });
});
