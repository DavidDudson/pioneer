import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const valid: object[] = [
  { key: 'CreatureSize', value: 'tiny', resizeEquipment: true },
  { key: 'CreatureSize', value: 'tiny', reach: { override: 0 }, resizeEquipment: true },
  { key: 'CreatureSize', value: 1, maximumSize: 'large', reach: { add: 5 }, predicate: ['terrain:full-moon'] },
  { key: 'CreatureSize', value: -1 },
];

describe('CreatureSize', () => {
  test.each(valid)('parses %j', (element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test.each([
    ['a size Pioneer does not name', { value: 'med' }],
    ['more steps than any creature moves', { value: 4 }],
    ['a reach that both overrides and adds', { value: 'large', reach: { override: 10, add: 5 } }],
    ['a negative reach', { value: 'large', reach: { override: -5 } }],
  ])('rejects %s', (_name, fields) => {
    expect(RuleElement.safeParse({ key: 'CreatureSize', ...fields }).success).toBe(false);
  });
});
