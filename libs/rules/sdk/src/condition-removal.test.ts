import { describe, expect, test } from 'bun:test';

import { ConditionRemoval } from './condition';

const CONDITION = '4218b8f3-1756-50cd-a914-6ce750659a62';

describe('ConditionRemoval', () => {
  test('a lowering says how many points it takes off, a counteract at what rank', () => {
    expect(ConditionRemoval.safeParse({ condition: CONDITION, effect: 'lower', by: 2 }).success).toBe(true);
    expect(ConditionRemoval.safeParse({ condition: CONDITION, effect: 'counteract', rank: 3 }).success).toBe(true);
    expect(ConditionRemoval.safeParse({ condition: CONDITION, effect: 'remove' }).success).toBe(true);
  });

  test.each([
    { effect: 'remove', by: 1 },
    { effect: 'counteract', by: 1 },
    { effect: 'lower', rank: 2 },
    { effect: 'remove', rank: 2 },
  ])('$effect cannot carry what only another effect has', (fields) => {
    expect(ConditionRemoval.safeParse({ condition: CONDITION, ...fields }).success).toBe(false);
  });

  test('a rank is a spell rank, 1 to 10', () => {
    expect(ConditionRemoval.safeParse({ condition: CONDITION, effect: 'counteract', rank: 0 }).success).toBe(false);
    expect(ConditionRemoval.safeParse({ condition: CONDITION, effect: 'counteract', rank: 11 }).success).toBe(false);
  });
});
