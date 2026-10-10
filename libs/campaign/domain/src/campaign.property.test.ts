import { describe, expect, test } from 'bun:test';

import { newId, nextVersion, UserId } from '@pioneer/shared/kernel';
import { array, assert, boolean, integer, nat, property, tuple } from 'fast-check';

import { Campaign } from './campaign';
import { CampaignRole } from './campaign-fields';
import { CampaignBuilder } from './testing';

/** A party of one to five players, and steps that each hand over or remove a member chosen by index. */
const party = integer({ min: 1, max: 5 }).map((players) => {
  const builder = new CampaignBuilder();
  for (let added = 0; added < players; added += 1) {
    builder.withPlayer(UserId.parse(newId()));
  }
  return builder.build();
});
const steps = array(tuple(boolean(), nat()), { maxLength: 12 });

/** Exactly one GM member, and it is `gmId`. */
function oneGm(campaign: Campaign): boolean {
  const gms = campaign.members.filter((member) => member.role === CampaignRole.Gm);
  return gms.length === 1 && gms[0]?.userId === campaign.gmId;
}

describe('Campaign (properties)', () => {
  test('handing over and removing keep one GM, stay valid and move the version on by one per change', () => {
    assert(
      property(party, steps, (start, moves) => {
        let campaign = start;
        for (const [handOver, pick] of moves) {
          const member = campaign.members[pick % campaign.members.length];
          const before = campaign;
          if (member === undefined) {
            throw new Error('A campaign always has its GM');
          }
          if (handOver) {
            campaign = campaign.withGm(member.id);
          } else if (member.role === CampaignRole.Player) {
            campaign = campaign.withoutMember(member.id);
          }
          expect(oneGm(campaign)).toBe(true);
          expect(Campaign.codec.parse(Campaign.codec.encode(campaign))).toStrictEqual(campaign);
          const changed = campaign !== before;
          expect(campaign.version).toBe(changed ? nextVersion(before.version) : before.version);
        }
      }),
    );
  });
});
