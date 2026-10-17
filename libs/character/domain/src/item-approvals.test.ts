import { describe, expect, test } from 'bun:test';

import type { ContentId } from '@pioneer/rules/sdk';
import { newId } from '@pioneer/shared/kernel';

import { InventoryItemId } from './inventory';
import { ItemApproval, partitionApproved } from './item-approvals';
import { RuleBreak, RuleCount } from './rule-violations';
import type { RuleViolation } from './rule-violations';

const caliburn = InventoryItemId.parse(newId());
const longsword = InventoryItemId.parse(newId());
const flaming = newId() as ContentId;
const frost = newId() as ContentId;

const runes = (item: InventoryItemId, actual: number): RuleViolation => ({
  item,
  rule: RuleBreak.PropertyRunes,
  limit: RuleCount.parse(1),
  actual: RuleCount.parse(actual),
});
const misfit = (item: InventoryItemId, rune: ContentId): RuleViolation => ({
  item,
  rule: RuleBreak.RuneNotAllowed,
  rune,
});
const approval = (input: unknown): ItemApproval => ItemApproval.parse(input);

describe('partitionApproved', () => {
  test('with no approval every violation still warns', () => {
    const violations = [runes(caliburn, 7)];
    expect(partitionApproved(violations, [])).toStrictEqual({ open: violations, approved: [] });
  });

  test('an approval covers its item and rule up to the count approved', () => {
    const approved = approval({ item: caliburn, rule: RuleBreak.PropertyRunes, value: 7 });
    const shrunk = runes(caliburn, 6);
    const same = runes(caliburn, 7);
    expect(partitionApproved([shrunk, same], [approved]).approved).toStrictEqual([shrunk, same]);
  });

  test('the warning comes back when the item breaks the rule by more than was approved', () => {
    const approved = approval({ item: caliburn, rule: RuleBreak.PropertyRunes, value: 7 });
    const grown = runes(caliburn, 8);
    expect(partitionApproved([grown], [approved])).toStrictEqual({ open: [grown], approved: [] });
  });

  test('an approval is for one item and one rule', () => {
    const approved = approval({ item: caliburn, rule: RuleBreak.PropertyRunes, value: 7 });
    const other = runes(longsword, 7);
    const otherRule: RuleViolation = {
      item: caliburn,
      rule: RuleBreak.Hands,
      limit: RuleCount.parse(2),
      actual: RuleCount.parse(3),
    };
    expect(partitionApproved([other, otherRule], [approved]).open).toStrictEqual([other, otherRule]);
  });

  test('a rune not allowed is approved for that rune only', () => {
    const approved = approval({ item: caliburn, rule: RuleBreak.RuneNotAllowed, rune: flaming, value: 1 });
    const allowed = misfit(caliburn, flaming);
    const other = misfit(caliburn, frost);
    expect(partitionApproved([allowed, other], [approved])).toStrictEqual({ open: [other], approved: [allowed] });
  });
});
