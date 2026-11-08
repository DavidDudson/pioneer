import { describe, expect, test } from 'bun:test';

import { ConditionChange, ConditionEffect, ConditionValue, ContentId } from '@pioneer/rules/sdk';

import { easeCondition } from './condition-ease';
import { ConditionDurationKind, ConditionInstanceId } from './conditions';
import type { ActiveCondition } from './conditions';

const held = (value?: number): ActiveCondition => ({
  id: ConditionInstanceId.parse('00000000-0000-4000-8000-000000000001'),
  condition: ContentId.parse('00000000-0000-4000-8000-0000000000c1'),
  ...(value === undefined ? {} : { value: ConditionValue.parse(value) }),
  duration: { kind: ConditionDurationKind.Unlimited },
});

describe('easeCondition', () => {
  test('removing ends the condition whatever its value', () => {
    expect(easeCondition(held(4), { effect: ConditionEffect.Remove })).toEqual({ ended: true });
  });

  test('lowering takes 1 off when the change gives no amount', () => {
    expect(easeCondition(held(3), { effect: ConditionEffect.Lower })).toEqual({
      ended: false,
      value: ConditionValue.parse(2),
    });
  });

  test('lowering by 2 takes 2 off', () => {
    expect(easeCondition(held(4), ConditionChange.parse({ effect: ConditionEffect.Lower, by: 2 }))).toEqual({
      ended: false,
      value: ConditionValue.parse(2),
    });
  });

  test.each([
    [1, 1],
    [2, 2],
    [2, 3],
  ])('a condition at %i lowered by %i ends, as nothing is left', (value, by) => {
    expect(easeCondition(held(value), ConditionChange.parse({ effect: ConditionEffect.Lower, by }))).toEqual({
      ended: true,
    });
  });

  test('a condition without a value counts as 1', () => {
    expect(easeCondition(held(), { effect: ConditionEffect.Lower })).toEqual({ ended: true });
  });
});
