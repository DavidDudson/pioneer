import { beforeEach, describe, expect, test } from 'bun:test';

import { CampaignCommand, CampaignName } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, ForbiddenError, newId, NotFoundError, UserId } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignService } from './campaign-service';
import { InMemoryCampaignInviteRepository } from './in-memory-campaign-invite-repository';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryMemberDirectory } from './in-memory-member-directory';

const vaults = CampaignName.parse('Abomination Vaults');
const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const seelah = UserId.parse(newId());

describe('archiving a campaign (ADR-0062)', () => {
  let service: CampaignService;
  let repository: InMemoryCampaignRepository;

  beforeEach(() => {
    repository = new InMemoryCampaignRepository();
    service = new CampaignService(
      {
        campaigns: repository,
        invites: new InMemoryCampaignInviteRepository(),
        directory: new InMemoryMemberDirectory(),
      },
      fixedClock('2026-10-15T08:00:00Z'),
    );
  });

  test('an archived campaign leaves the list and reads as missing, and is on the GM’s archived list', async () => {
    const created = await service.create(amiri, { name: vaults });
    await service.archive(amiri, created.id);
    expect(await service.list(amiri)).toStrictEqual([]);
    expect(await rejection(service.get(amiri, created.id))).toBeInstanceOf(NotFoundError);
    expect(await rejection(service.roster(amiri, created.id))).toBeInstanceOf(NotFoundError);
    const archived = await service.listArchived(amiri);
    expect(archived.map((campaign) => campaign.id)).toStrictEqual([created.id]);
  });

  test('restoring brings it back unchanged', async () => {
    const created = await service.create(amiri, { name: vaults });
    await service.archive(amiri, created.id);
    await service.restore(amiri, created.id);
    expect(await service.get(amiri, created.id)).toStrictEqual(created);
    expect(await service.listArchived(amiri)).toStrictEqual([]);
  });

  test('archiving twice and restoring a live campaign are harmless', async () => {
    const created = await service.create(amiri, { name: vaults });
    await service.restore(amiri, created.id);
    await service.archive(amiri, created.id);
    const again = await service.archive(amiri, created.id);
    expect(again.id).toBe(created.id);
  });

  test('a player is refused and a stranger gets a 404, live or archived', async () => {
    const created = await repository.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
    expect(await rejection(service.archive(ezren, created.id))).toBeInstanceOf(ForbiddenError);
    expect(await rejection(service.archive(seelah, created.id))).toBeInstanceOf(NotFoundError);
    await service.archive(amiri, created.id);
    expect(await rejection(service.restore(seelah, created.id))).toBeInstanceOf(NotFoundError);
    expect(await service.listArchived(seelah)).toStrictEqual([]);
  });

  test('archive and restore are audited by name', async () => {
    const created = await service.create(amiri, { name: vaults });
    await service.archive(amiri, created.id);
    await service.restore(amiri, created.id);
    expect(repository.audits).toStrictEqual([
      { actor: amiri, command: CampaignCommand.ArchiveCampaign },
      { actor: amiri, command: CampaignCommand.RestoreCampaign },
    ]);
  });
});
