import { describe, expect, test } from 'bun:test';

import { ItemRule } from '@pioneer/campaign/domain';
import { RuleBreak } from '@pioneer/character/domain';

describe('the campaign context’s approvable rules against the character context’s', () => {
  test('the campaign names exactly the rules an inventory can break', () => {
    expect(Object.values(ItemRule).map(String).toSorted()).toStrictEqual(
      Object.values(RuleBreak).map(String).toSorted(),
    );
  });
});
