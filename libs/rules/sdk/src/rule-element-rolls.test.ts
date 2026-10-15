import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const valid: object[] = [
  { key: 'AdjustDegreeOfSuccess', selectors: ['save:will'], adjustment: { success: 'one-degree-better' } },
  {
    key: 'AdjustDegreeOfSuccess',
    selectors: ['saving-throw'],
    adjustment: { failure: 'one-degree-worse', success: 'one-degree-better' },
    checkType: 'save',
    predicate: ['item:trait:fear'],
  },
  { key: 'AdjustDegreeOfSuccess', selectors: ['perception'], adjustment: { all: 'to-critical-failure' } },
  { key: 'RollTwice', selectors: ['attack-roll', 'skill-check'], keep: 'higher' },
  { key: 'RollTwice', selectors: ['save:will'], keep: 'lower', predicate: ['action:seek'] },
  { key: 'SubstituteRoll', selectors: ['skill-check'], slug: 'assured-knowledge', value: 10 },
];

describe('roll elements', () => {
  test.each(valid)('parses %j', (element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test.each([
    ['an adjustment that changes nothing', { key: 'AdjustDegreeOfSuccess', selectors: ['ac'], adjustment: {} }],
    [
      'a degree change Pioneer does not name',
      { key: 'AdjustDegreeOfSuccess', selectors: ['ac'], adjustment: { success: 'better' } },
    ],
    [
      'a check type it does not know',
      { key: 'AdjustDegreeOfSuccess', selectors: ['ac'], adjustment: { all: 'to-success' }, checkType: 'flat' },
    ],
    ['a RollTwice that keeps neither', { key: 'RollTwice', selectors: ['ac'], keep: 'middle' }],
    [
      'a RollTwice with Foundry’s removeAfterRoll',
      { key: 'RollTwice', selectors: ['ac'], keep: 'lower', removeAfterRoll: true },
    ],
    ['a SubstituteRoll with no value', { key: 'SubstituteRoll', selectors: ['ac'], slug: 'assurance' }],
    ['a SubstituteRoll above 99', { key: 'SubstituteRoll', selectors: ['ac'], slug: 'assurance', value: 100 }],
  ])('rejects %s', (_name, element) => {
    expect(RuleElement.safeParse(element).success).toBe(false);
  });
});
