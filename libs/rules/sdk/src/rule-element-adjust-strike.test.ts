import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const valid: object[] = [
  { key: 'AdjustStrike', property: 'traits', mode: 'add', value: 'holy' },
  { key: 'AdjustStrike', property: 'traits', mode: 'remove', value: 'thrown-10', strikes: ['item:ranged'] },
  { key: 'AdjustStrike', property: 'materials', mode: 'add', value: 'silver', strikes: ['item:slug:longsword'] },
  {
    key: 'AdjustStrike',
    property: 'property-runes',
    mode: 'add',
    value: 'ghost-touch',
    strikes: ['item:deity-favored'],
    predicate: ['self:trait:holy'],
  },
  { key: 'AdjustStrike', property: 'range-increment', mode: 'multiply', value: 2, strikes: ['item:thrown'] },
];

describe('AdjustStrike', () => {
  test.each(valid)('parses %j', (element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test('a material or rune can only be added, and a trait is a trait', () => {
    const removeMaterial = { key: 'AdjustStrike', property: 'materials', mode: 'remove', value: 'silver' };
    const removeRune = { key: 'AdjustStrike', property: 'property-runes', mode: 'remove', value: 'keen' };
    const unread = { key: 'AdjustStrike', property: 'traits', mode: 'add', value: '{item|flags.x}' };

    expect([removeMaterial, removeRune, unread].map((element) => RuleElement.safeParse(element).success)).toEqual([
      false,
      false,
      false,
    ]);
  });

  test('an unknown property is rejected', () => {
    expect(RuleElement.safeParse({ key: 'AdjustStrike', property: 'reach', mode: 'add', value: 5 }).success).toBe(
      false,
    );
  });
});

describe('CriticalSpecialization', () => {
  test.each([{ key: 'CriticalSpecialization' }, { key: 'CriticalSpecialization', predicate: ['item:group:sword'] }])(
    'parses %j',
    (element) => {
      expect(RuleElement.safeParse(element).success).toBe(true);
    },
  );

  test('has no other fields', () => {
    expect(RuleElement.safeParse({ key: 'CriticalSpecialization', alternate: true }).success).toBe(false);
  });
});

describe('AdjustStrike etched', () => {
  test('parses on every property', () => {
    const base = { key: 'AdjustStrike', etched: true };
    const elements = [
      { ...base, property: 'traits', mode: 'add', value: 'returning' },
      { ...base, property: 'property-runes', mode: 'add', value: 'ghost-touch' },
      { ...base, property: 'range-increment', mode: 'add', value: 10 },
    ];

    expect(elements.map((element) => RuleElement.safeParse(element).success)).toEqual([true, true, true]);
  });

  test('is only ever true', () => {
    const element = { key: 'AdjustStrike', property: 'traits', mode: 'add', value: 'returning', etched: false };

    expect(RuleElement.safeParse(element).success).toBe(false);
  });
});
