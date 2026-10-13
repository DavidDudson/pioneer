import { describe, expect, test } from 'bun:test';

import { HomebrewPackBuilder } from '@pioneer/homebrew/domain/testing';
import { PackVisibility } from '@pioneer/rules/sdk';
import { newId, UserId } from '@pioneer/shared/kernel';

import { InMemoryPackEnablementDirectory } from './in-memory-pack-enablement-directory';
import { PackAccessPolicy } from './pack-access-policy';

const owner = UserId.parse(newId());
const member = UserId.parse(newId());
const stranger = UserId.parse(newId());

/** Every visibility against every kind of reader; `member` belongs to a campaign that enables the pack. */
const table = [
  [PackVisibility.Private, { owner: true, member: false, stranger: false }],
  [PackVisibility.Campaign, { owner: true, member: true, stranger: false }],
  [PackVisibility.Public, { owner: true, member: true, stranger: true }],
] as const;

describe('PackAccessPolicy', () => {
  describe.each(table)('a %s pack', (visibility, expected) => {
    const pack = new HomebrewPackBuilder().ownedBy(owner).visibleTo(visibility).build();
    const policy = new PackAccessPolicy(
      new InMemoryPackEnablementDirectory().enable(pack.id, 'Rise of the Runelords', [member]),
    );

    test.each([
      ['owner', owner],
      ['member', member],
      ['stranger', stranger],
    ] as const)('%s', async (reader, user) => {
      expect(await policy.mayRead(user, pack)).toBe(expected[reader]);
    });
  });

  test('a campaign pack is closed to members of campaigns that do not enable it', async () => {
    const pack = new HomebrewPackBuilder().ownedBy(owner).visibleTo(PackVisibility.Campaign).build();
    const other = new HomebrewPackBuilder().slug('other-pack').ownedBy(owner).build();
    const policy = new PackAccessPolicy(new InMemoryPackEnablementDirectory().enable(other.id, 'Kingmaker', [member]));
    expect(await policy.mayRead(member, pack)).toBe(false);
  });

  test('only the owner owns the pack, whatever its visibility', () => {
    const pack = new HomebrewPackBuilder().ownedBy(owner).visibleTo(PackVisibility.Public).build();
    expect(PackAccessPolicy.owns(owner, pack)).toBe(true);
    expect(PackAccessPolicy.owns(member, pack)).toBe(false);
  });
});
