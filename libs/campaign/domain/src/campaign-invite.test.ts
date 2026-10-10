import { describe, expect, test } from 'bun:test';

import { derivedId, FixtureNamespace, fixedClock, UserId } from '@pioneer/shared/kernel';

import { CampaignId, CampaignInviteId, InviteTokenHash } from './campaign-fields';
import { CampaignInvite, INVITE_LIFETIME, InviteStatus, InviteSummary } from './campaign-invite';

const now = fixedClock('2026-10-10T10:00:00Z').now();
const invite = CampaignInvite.issue({
  id: CampaignInviteId.parse(derivedId(FixtureNamespace, 'invite:vaults')),
  campaignId: CampaignId.parse(derivedId(FixtureNamespace, 'campaign:vaults')),
  tokenHash: InviteTokenHash.parse('a'.repeat(64)),
  createdBy: UserId.parse(derivedId(FixtureNamespace, 'user:Amiri')),
  now,
});

describe('CampaignInvite', () => {
  test('is open until the instant it expires', () => {
    expect(invite.expiresAt).toStrictEqual(now.add(INVITE_LIFETIME));
    expect(invite.statusAt(invite.expiresAt.subtract({ nanoseconds: 1 }))).toBe(InviteStatus.Open);
    expect(invite.statusAt(invite.expiresAt)).toBe(InviteStatus.Expired);
  });

  test('revoked wins over expired, and the first revocation sticks', () => {
    const revoked = invite.revoke(now.add({ hours: 1 }));
    expect(revoked.statusAt(now)).toBe(InviteStatus.Revoked);
    expect(revoked.statusAt(invite.expiresAt)).toBe(InviteStatus.Revoked);
    expect(revoked.revoke(now.add({ hours: 2 }))).toBe(revoked);
  });

  test('its summary round-trips the wire and leaves the token hash out', () => {
    const revoked = invite.revoke(now);
    const wire = InviteSummary.encode(revoked.toSummary());
    expect(Object.keys(wire).toSorted()).toStrictEqual(['createdAt', 'expiresAt', 'id', 'revokedAt']);
    expect(InviteSummary.decode(wire)).toStrictEqual(revoked.toSummary());
    expect(Object.keys(invite.toSummary())).not.toContain('revokedAt');
  });
});
