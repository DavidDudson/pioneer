import { describe, expect, test } from 'bun:test';

import { conditionHolds, FilterKind, filterSchema, filtersParam } from './filter-condition';
import type { FilterCondition } from './filter-condition';

const PROPERTIES = { name: FilterKind.Text, level: FilterKind.Number, trait: FilterKind.Set } as const;

const schema = filterSchema(PROPERTIES);

describe('filterSchema', () => {
  test('accepts an operator the property’s kind allows', () => {
    const parsed = schema.safeParse([
      { property: 'level', operator: 'between', values: ['2', ''] },
      { property: 'trait', operator: 'isAnyOf', values: ['fire', 'cold'] },
      { property: 'name', operator: 'contains', values: ['kyr'] },
    ]);

    expect(parsed.success).toBe(true);
  });

  test.each([
    ['gt on a text property', { property: 'name', operator: 'gt', values: ['a'] }],
    ['contains on a number', { property: 'level', operator: 'contains', values: ['1'] }],
    ['isAnyOf on a number', { property: 'level', operator: 'isAnyOf', values: ['1'] }],
    ['an unknown property', { property: 'owner', operator: 'is', values: ['x'] }],
    ['an unknown operator', { property: 'name', operator: 'like', values: ['x'] }],
    ['no value', { property: 'name', operator: 'is', values: [] }],
    ['two values for is', { property: 'name', operator: 'is', values: ['a', 'b'] }],
    ['a text value on a number', { property: 'level', operator: 'gt', values: ['high'] }],
    ['between with one bound', { property: 'level', operator: 'between', values: ['1'] }],
    ['an extra key', { property: 'name', operator: 'is', values: ['a'], extra: true }],
  ])('rejects %s', (_name, condition) => {
    expect(schema.safeParse([condition]).success).toBe(false);
  });
});

describe('filtersParam', () => {
  const param = filtersParam(PROPERTIES);

  test('reads JSON text, and absent means none', () => {
    expect(param.parse(undefined)).toStrictEqual([]);
    expect(param.parse('[{"property":"level","operator":"gt","values":["3"]}]')).toHaveLength(1);
  });

  test('rejects text that is not JSON', () => {
    expect(param.safeParse('level').success).toBe(false);
  });
});

describe('conditionHolds', () => {
  test('numbers compare as numbers and an open bound is open', () => {
    const between: FilterCondition = { property: 'level', operator: 'between', values: ['', '9'] };
    expect(conditionHolds(FilterKind.Number, between, 10)).toBe(false);
    expect(conditionHolds(FilterKind.Number, between, 2)).toBe(true);
  });

  test('contains ignores case and is not keeps a missing value', () => {
    expect(conditionHolds(FilterKind.Text, { property: 'name', operator: 'contains', values: ['KYR'] }, 'Kyra')).toBe(
      true,
    );

    expect(conditionHolds(FilterKind.Set, { property: 'trait', operator: 'isNot', values: ['fire'] }, undefined)).toBe(
      true,
    );
  });
});
