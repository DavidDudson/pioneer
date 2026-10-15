import { describe, expect, test } from 'bun:test';

import { fieldIssues } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';

import { contentId, EntrySlug, PackId } from './content-id';
import { RulesMessage } from './messages';
import { Charges, STAFF_CANTRIP, StaffRank, staffCharges, StaffSpells } from './staff';

function issuesOf(value: unknown): readonly FieldIssue[] {
  const result = StaffSpells.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

const spell = (slug: string): string => contentId(PackId.parse('player-core'), EntrySlug.parse(`spell:${slug}`));

describe('StaffSpells', () => {
  test('reads spells by rank, cantrips first', () => {
    const staff = StaffSpells.parse([
      { rank: 'cantrip', spells: [spell('ignition')] },
      { rank: 1, spells: [spell('breathe-fire')] },
      { rank: 3, spells: [spell('floating-flame'), spell('fireball')] },
    ]);

    expect(staff.map(({ rank }) => rank)).toEqual([STAFF_CANTRIP, StaffRank.parse(1), StaffRank.parse(3)]);
  });

  test('refuses a rank listed twice, naming it', () => {
    const [issue] = issuesOf([
      { rank: 2, spells: [spell('heal')] },
      { rank: 2, spells: [spell('fireball')] },
    ]);

    expect(issue?.path).toEqual([1, 'rank']);
    expect(issue?.message.key).toBe(RulesMessage.ListDuplicate);
  });

  test('refuses a spell listed twice under one rank, an empty rank and an empty staff', () => {
    const twice = StaffSpells.safeParse([{ rank: 1, spells: [spell('heal'), spell('heal')] }]);
    const empty = StaffSpells.safeParse([{ rank: 1, spells: [] }]);
    const none = StaffSpells.safeParse([]);

    expect([twice.success, empty.success, none.success]).toEqual([false, false, false]);
  });

  test('refuses a rank above the 10th and a rank that is not a cantrip', () => {
    expect(StaffRank.safeParse(11).success).toBe(false);
    expect(StaffRank.safeParse('focus').success).toBe(false);
  });
});

describe('staffCharges', () => {
  test('costs the rank in charges and nothing for a cantrip', () => {
    expect(staffCharges(STAFF_CANTRIP)).toBe(Charges.parse(0));
    expect(staffCharges(StaffRank.parse(1))).toBe(Charges.parse(1));
    expect(staffCharges(StaffRank.parse(10))).toBe(Charges.parse(10));
  });
});
