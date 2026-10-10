import { describe, expect, test } from 'bun:test';

import { FIRST_VERSION, fixedClock, newId, UserId } from '@pioneer/shared/kernel';

import { Campaign } from './campaign';
import { CampaignId, CampaignMemberId, CampaignName, CampaignRole } from './campaign-fields';
import { CampaignBuilder, fixtureGmId } from './testing';

const ezren = UserId.parse(newId());
const now = fixedClock('2026-10-10T10:00:00Z').now();

describe('Campaign', () => {
  test('create makes the creator its GM and only member', () => {
    const gmMemberId = CampaignMemberId.parse(newId());
    const campaign = Campaign.create({
      id: CampaignId.parse(newId()),
      gmMemberId,
      gmId: fixtureGmId,
      name: CampaignName.parse('  Abomination Vaults '),
      now,
    });
    expect(campaign.version).toBe(FIRST_VERSION);
    expect(campaign.name).toBe(CampaignName.parse('Abomination Vaults'));
    expect(campaign.gmId).toBe(fixtureGmId);
    expect(campaign.members).toStrictEqual([
      { id: gmMemberId, userId: fixtureGmId, role: CampaignRole.Gm, joinedAt: now },
    ]);
  });

  test('roleOf names each member’s role and nothing for anyone else', () => {
    const campaign = new CampaignBuilder().withPlayer(ezren).build();
    expect(campaign.roleOf(fixtureGmId)).toBe(CampaignRole.Gm);
    expect(campaign.roleOf(ezren)).toBe(CampaignRole.Player);
    const stranger = UserId.parse(newId());
    expect(campaign.roleOf(stranger)).toBeUndefined();
  });

  test('the codec round-trips through wire JSON', () => {
    const campaign = new CampaignBuilder().withPlayer(ezren).build();
    const wire = Campaign.codec.encode(campaign);
    expect(Campaign.codec.parse(wire)).toStrictEqual(campaign);
  });

  test('wire data must have exactly one GM member, and it is the GM', () => {
    const wire = Campaign.codec.encode(new CampaignBuilder().withPlayer(ezren).build());
    const [gm, player] = wire.members;
    expect(Campaign.codec.safeParse({ ...wire, members: [] }).success).toBe(false);
    expect(Campaign.codec.safeParse({ ...wire, gmId: ezren }).success).toBe(false);
    expect(Campaign.codec.safeParse({ ...wire, members: [gm, { ...player, role: CampaignRole.Gm }] }).success).toBe(
      false,
    );
  });

  test('a blank or overlong name is rejected', () => {
    expect(CampaignName.safeParse('   ').success).toBe(false);
    expect(CampaignName.safeParse('x'.repeat(81)).success).toBe(false);
  });
});
