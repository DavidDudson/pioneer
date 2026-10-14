import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const valid: object[] = [
  { key: 'FastHealing', value: 5 },
  { key: 'FastHealing', value: '@item.level * 2' },
  { key: 'FastHealing', value: 15, type: 'regeneration', deactivatedBy: ['acid', 'fire'] },
  { key: 'TempHP', value: 8 },
  { key: 'TempHP', value: '@level', predicate: ['self:effect:rage'] },
];

describe('FastHealing and TempHP', () => {
  test.each(valid)('parses %j', (element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test('a FastHealing with a repeated or empty deactivatedBy is rejected', () => {
    expect(RuleElement.safeParse({ key: 'FastHealing', value: 5, deactivatedBy: ['fire', 'fire'] }).success).toBe(
      false,
    );
    expect(RuleElement.safeParse({ key: 'FastHealing', value: 5, deactivatedBy: [] }).success).toBe(false);
  });

  test('a FastHealing of an unknown type is rejected', () => {
    expect(RuleElement.safeParse({ key: 'FastHealing', value: 5, type: 'leech' }).success).toBe(false);
  });
});
