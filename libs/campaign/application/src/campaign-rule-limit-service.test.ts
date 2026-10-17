import { beforeEach, describe, expect, test } from 'bun:test';

import { CORE_LIMIT_DEFAULTS, LIMIT_CEILINGS, RuleLimitKey, RuleLimitValue } from '@pioneer/campaign/domain';
import type { Campaign, CampaignRuleLimits } from '@pioneer/campaign/domain';
import { CampaignBuilder } from '@pioneer/campaign/domain/testing';
import { fixedClock, ForbiddenError, newId, NotFoundError, UserId, ValidationError } from '@pioneer/shared/kernel';
import { rejection } from '@pioneer/shared/kernel/testing';

import { CampaignRuleLimitService } from './campaign-rule-limit-service';
import { InMemoryCampaignRepository } from './in-memory-campaign-repository';
import { InMemoryCampaignRuleLimitRepository } from './in-memory-campaign-rule-limit-repository';

const amiri = UserId.parse(newId());
const ezren = UserId.parse(newId());
const stranger = UserId.parse(newId());
const twelve = RuleLimitValue.parse(12);

function valueOf(limits: CampaignRuleLimits, limit: RuleLimitKey): number | undefined {
  return limits.limits.find((each) => each.limit === limit)?.value;
}

describe('CampaignRuleLimitService', () => {
  let campaigns: InMemoryCampaignRepository;
  let service: CampaignRuleLimitService;
  let vaults: Campaign;

  beforeEach(async () => {
    campaigns = new InMemoryCampaignRepository();
    service = new CampaignRuleLimitService(
      { campaigns, limits: new InMemoryCampaignRuleLimitRepository() },
      fixedClock('2026-10-17T10:00:00Z'),
    );
    vaults = await campaigns.insert(new CampaignBuilder().ranBy(amiri).withPlayer(ezren).build());
  });

  test('a campaign that set nothing has the core rules, none custom', async () => {
    const limits = await service.ruleLimits(amiri, vaults.id);
    expect(limits.manageable).toBe(true);
    expect(limits.limits.map(({ limit, value, custom }) => [limit, value, custom])).toStrictEqual(
      Object.values(RuleLimitKey).map((limit) => [limit, CORE_LIMIT_DEFAULTS[limit], false]),
    );
  });

  test('the GM sets a limit; a player sees it and cannot change it', async () => {
    await service.set(amiri, vaults.id, { limit: RuleLimitKey.InvestedMax, value: twelve });
    const seen = await service.ruleLimits(ezren, vaults.id);
    expect(seen.manageable).toBe(false);
    expect(valueOf(seen, RuleLimitKey.InvestedMax)).toBe(12);
    expect(valueOf(seen, RuleLimitKey.HandsMax)).toBe(CORE_LIMIT_DEFAULTS[RuleLimitKey.HandsMax]);
    expect(
      await rejection(service.set(ezren, vaults.id, { limit: RuleLimitKey.InvestedMax, value: twelve })),
    ).toBeInstanceOf(ForbiddenError);
  });

  test('setting a limit again replaces the number', async () => {
    await service.set(amiri, vaults.id, { limit: RuleLimitKey.InvestedMax, value: twelve });
    const again = await service.set(amiri, vaults.id, {
      limit: RuleLimitKey.InvestedMax,
      value: RuleLimitValue.parse(8),
    });
    expect(valueOf(again, RuleLimitKey.InvestedMax)).toBe(8);
    expect(again.limits.filter(({ custom }) => custom)).toHaveLength(1);
  });

  test('a reset returns one limit to the core number and leaves the others', async () => {
    await service.set(amiri, vaults.id, { limit: RuleLimitKey.InvestedMax, value: twelve });
    await service.set(amiri, vaults.id, { limit: RuleLimitKey.HandsMax, value: RuleLimitValue.parse(3) });
    const reset = await service.reset(amiri, vaults.id, RuleLimitKey.InvestedMax);
    expect(valueOf(reset, RuleLimitKey.InvestedMax)).toBe(CORE_LIMIT_DEFAULTS[RuleLimitKey.InvestedMax]);
    expect(valueOf(reset, RuleLimitKey.HandsMax)).toBe(3);
    expect(await service.reset(amiri, vaults.id, RuleLimitKey.InvestedMax)).toStrictEqual(reset);
  });

  test('a player cannot reset a limit', async () => {
    expect(await rejection(service.reset(ezren, vaults.id, RuleLimitKey.InvestedMax))).toBeInstanceOf(ForbiddenError);
  });

  test('a number past the limit’s ceiling is refused and stores nothing', async () => {
    const past = RuleLimitValue.parse(LIMIT_CEILINGS[RuleLimitKey.HandsMax] + 1);
    expect(
      await rejection(service.set(amiri, vaults.id, { limit: RuleLimitKey.HandsMax, value: past })),
    ).toBeInstanceOf(ValidationError);
    const limits = await service.ruleLimits(amiri, vaults.id);
    expect(limits.limits.filter(({ custom }) => custom)).toStrictEqual([]);
  });

  test('a non-member gets the 404 of a missing campaign', async () => {
    expect(await rejection(service.ruleLimits(stranger, vaults.id))).toBeInstanceOf(NotFoundError);
    expect(
      await rejection(service.set(stranger, vaults.id, { limit: RuleLimitKey.InvestedMax, value: twelve })),
    ).toBeInstanceOf(NotFoundError);
  });
});
