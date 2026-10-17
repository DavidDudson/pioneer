import { describe, expect, test } from 'bun:test';

import { mergeVariantLimits, VariantLimitValue, VariantRuleLimits } from './variant-rule-limits';

const value = (number: number): VariantLimitValue => VariantLimitValue.parse(number);

describe('mergeVariantLimits', () => {
  test('no variants change nothing', () => {
    expect<object>(mergeVariantLimits([])).toStrictEqual({});
  });

  test('a limit only one variant changes is that variant’s', () => {
    expect<object>(mergeVariantLimits([{ investedMax: value(12) }, { handsMax: value(3) }])).toStrictEqual({
      investedMax: 12,
      handsMax: 3,
    });
  });

  test('two variants that conflict: the more permissive wins, whichever comes first', () => {
    const low = { investedMax: value(8), itemsMax: value(900) };
    const high = { investedMax: value(12), itemsMax: value(600) };
    const expected = { investedMax: 12, itemsMax: 900 };
    expect<object>(mergeVariantLimits([low, high])).toStrictEqual(expected);
    expect<object>(mergeVariantLimits([high, low])).toStrictEqual(expected);
  });

  test('a variant may lower a limit; with nothing else changing it, it applies', () => {
    expect<object>(mergeVariantLimits([{ handsMax: value(1) }])).toStrictEqual({ handsMax: 1 });
  });
});

describe('VariantRuleLimits', () => {
  test('is a closed set of the four table limits', () => {
    expect(VariantRuleLimits.safeParse({ investedMax: 12 }).success).toBe(true);
    expect(VariantRuleLimits.safeParse({ bulkMax: 12 }).success).toBe(false);
  });

  test('holds a number to the limit’s ceiling and from 1', () => {
    expect(VariantRuleLimits.safeParse({ handsMax: 11 }).success).toBe(false);
    expect(VariantRuleLimits.safeParse({ investedMax: 0 }).success).toBe(false);
  });
});
