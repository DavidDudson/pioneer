import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const valid: object[] = [
  {
    key: 'DamageDice',
    selectors: ['strike-damage'],
    diceNumber: 1,
    dieSize: 'd6',
    category: 'precision',
    predicate: ['self:condition:undetected'],
  },
  { key: 'DamageDice', selectors: ['strike-damage'], diceNumber: '@level' },
  { key: 'DamageDice', selectors: ['strike-damage'], override: { damageType: 'bludgeoning' } },
  { key: 'DamageAlteration', selectors: ['strike-damage'], property: 'dice-number', mode: 'add', value: 2 },
  { key: 'DamageAlteration', selectors: ['strike-damage'], property: 'damage-type', mode: 'override', value: 'spirit' },
];

describe('DamageDice and DamageAlteration', () => {
  test.each(valid)('parses %j', (element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test('a DamageDice with no dice, number or override is rejected', () => {
    const result = RuleElement.safeParse({ key: 'DamageDice', selectors: ['strike-damage'], damageType: 'fire' });

    expect(result.success).toBe(false);
  });

  test('a damage type alteration can only override, and to a damage type', () => {
    const add = { key: 'DamageAlteration', selectors: ['x'], property: 'damage-type', mode: 'add', value: 'fire' };
    const unknown = {
      key: 'DamageAlteration',
      selectors: ['x'],
      property: 'damage-type',
      mode: 'override',
      value: 'x',
    };

    expect([add, unknown].map((element) => RuleElement.safeParse(element).success)).toEqual([false, false]);
  });
});
