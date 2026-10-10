import { describe, expect, test } from 'bun:test';

import { FIRST_VERSION, fixedClock, newId, nextVersion, UserId } from '@pioneer/shared/kernel';

import { Campaign } from './campaign';
import type { CampaignMember } from './campaign';
import { CampaignId, CampaignMemberId, CampaignName, CampaignRole } from './campaign-fields';
import { CampaignBuilder, fixtureGmId } from './testing';

const ezren = UserId.parse(newId());
const now = fixedClock('2026-10-10T10:00:00Z').now();

function memberOf(campaign: Campaign, userId: UserId): CampaignMember {
  const member = campaign.members.find((candidate) => candidate.userId === userId);
  if (member === undefined) {
    throw new Error(`No member ${userId}`);
  }
  return member;
}

describe('Campaign', () => {
  test('withPlayer adds a player once', () => {
    const campaign = new CampaignBuilder().build();
    const playerId = CampaignMemberId.parse(newId());
    const joined = campaign.withPlayer({ memberId: playerId, userId: ezren, now });
    expect(joined.roleOf(ezren)).toBe(CampaignRole.Player);
    expect(joined.version).toBe(nextVersion(campaign.version));
    expect(joined.members.at(-1)?.joinedAt).toStrictEqual(now);
    const memberId = CampaignMemberId.parse(newId());
    expect(joined.withPlayer({ memberId, userId: ezren, now })).toBe(joined);
    expect(campaign.withPlayer({ memberId, userId: fixtureGmId, now })).toBe(campaign);
  });

  test('withoutMember removes a player, and nothing for an unknown id', () => {
    const campaign = new CampaignBuilder().withPlayer(ezren).build();
    const removed = campaign.withoutMember(memberOf(campaign, ezren).id);
    expect(removed.roleOf(ezren)).toBeUndefined();
    expect(removed.members.map((member) => member.userId)).toStrictEqual([fixtureGmId]);
    expect(removed.version).toBe(nextVersion(campaign.version));
    expect(campaign.withoutMember(CampaignMemberId.parse(newId()))).toBe(campaign);
  });

  test('withoutMember never removes the GM', () => {
    const campaign = new CampaignBuilder().withPlayer(ezren).build();
    expect(() => campaign.withoutMember(memberOf(campaign, fixtureGmId).id)).toThrow();
  });

  test('withGm hands the role over and keeps the old GM as a player', () => {
    const campaign = new CampaignBuilder().withPlayer(ezren).build();
    const handed = campaign.withGm(memberOf(campaign, ezren).id);
    expect(handed.gmId).toBe(ezren);
    expect(handed.roleOf(ezren)).toBe(CampaignRole.Gm);
    expect(handed.roleOf(fixtureGmId)).toBe(CampaignRole.Player);
    expect(handed.version).toBe(nextVersion(campaign.version));
    // Still valid wire data: one GM member, and it is `gmId`.
    expect(Campaign.codec.parse(Campaign.codec.encode(handed))).toStrictEqual(handed);
  });

  test('withGm to the GM changes nothing, and to a stranger throws', () => {
    const campaign = new CampaignBuilder().withPlayer(ezren).build();
    expect(campaign.withGm(memberOf(campaign, fixtureGmId).id)).toBe(campaign);
    expect(() => campaign.withGm(CampaignMemberId.parse(newId()))).toThrow();
  });

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

  test('wire data lists each user once, so the GM can never read as a player', () => {
    const wire = Campaign.codec.encode(new CampaignBuilder().withPlayer(ezren).build());
    const [gm, player] = wire.members;
    const gmAsPlayerFirst = { ...player, userId: wire.gmId };
    expect(Campaign.codec.safeParse({ ...wire, members: [gmAsPlayerFirst, gm] }).success).toBe(false);
  });

  test('a blank or overlong name is rejected', () => {
    expect(CampaignName.safeParse('   ').success).toBe(false);
    expect(CampaignName.safeParse('x'.repeat(81)).success).toBe(false);
  });
});
