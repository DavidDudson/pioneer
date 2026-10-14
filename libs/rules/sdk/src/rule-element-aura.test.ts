import { describe, expect, test } from 'bun:test';

import { RuleElement } from './rule-element';

const EFFECT = '00000000-0000-5000-8000-000000000001';

const valid: object[] = [
  { key: 'Aura', radius: 30 },
  { key: 'Aura', radius: '5 * @level', slug: 'protective-ward' },
  {
    key: 'Aura',
    radius: 30,
    slug: 'dread-aura',
    traits: ['emotion', 'fear', 'mental'],
    effects: [{ effect: EFFECT, affects: 'enemies', events: ['enter', 'turn-start'] }],
  },
  {
    key: 'Aura',
    radius: 15,
    effects: [{ effect: EFFECT, affects: 'allies', includesSelf: false }],
    predicate: ['x:y'],
  },
];

describe('Aura', () => {
  test.each(valid)('parses %j', (element) => {
    expect(RuleElement.safeParse(element).success).toBe(true);
  });

  test.each([
    ['no radius', { effects: [] }],
    ['a negative radius', { radius: -5 }],
    [
      'an effect named by a compendium UUID',
      { radius: 5, effects: [{ effect: 'Compendium.pf2e.spell-effects.Item.X' }] },
    ],
    ['Foundry’s uuid on an effect', { radius: 5, effects: [{ uuid: EFFECT }] }],
    ['an effect that affects no one Pioneer names', { radius: 5, effects: [{ effect: EFFECT, affects: 'self' }] }],
    ['an effect with no events', { radius: 5, effects: [{ effect: EFFECT, events: [] }] }],
    ['a trait twice', { radius: 5, traits: ['holy', 'holy'] }],
  ])('rejects %s', (_name, fields) => {
    expect(RuleElement.safeParse({ key: 'Aura', ...fields }).success).toBe(false);
  });
});

describe('GrantItem choices', () => {
  const grant = { key: 'GrantItem', item: EFFECT };

  test('answers by flag parse', () => {
    expect(RuleElement.safeParse({ ...grant, choices: { assurance: 'athletics' } }).success).toBe(true);
  });

  test('an answer that is not a slug or an entry is rejected', () => {
    expect(RuleElement.safeParse({ ...grant, choices: { assurance: 'Not a slug' } }).success).toBe(false);
  });
});
