import { describe, expect, test } from 'bun:test';

import { loadRunes } from './rune-fixtures';

const ETCHED_DAMAGE = 'etched-damage';
const RUNES = await loadRunes();

const FORTITUDE_24 = { statistic: 'fortitude', dc: 24 };
const FORTITUDE_34 = { statistic: 'fortitude', dc: 34 };
const NEXT_TURN_END = { type: 'next-turn-end' };
const ELECTRIC_ARC = {
  kind: 'damage',
  damageType: 'electricity',
  amount: { type: 'equal' },
  target: { type: 'others', count: 2, within: 10 },
};
const ARMOR_ACID = { kind: 'damage', damageType: 'acid', target: { type: 'armor' } };

/** What each energy rune does besides its damage on a critical hit, by grade. */
const CRITICAL_EFFECTS: readonly (readonly [string, object])[] = [
  ['rune:frost', { kind: 'condition', condition: 'slowed', value: 1, duration: NEXT_TURN_END, save: FORTITUDE_24 }],
  [
    'rune:frost-greater',
    { kind: 'condition', condition: 'slowed', value: 1, duration: NEXT_TURN_END, save: FORTITUDE_34 },
  ],
  [
    'rune:thundering',
    {
      kind: 'condition',
      condition: 'deafened',
      duration: { type: 'time', count: 1, unit: 'minute' },
      save: FORTITUDE_24,
      criticalFailureDuration: { type: 'time', count: 1, unit: 'hour' },
    },
  ],
  [
    'rune:thundering-greater',
    { kind: 'condition', condition: 'deafened', duration: { type: 'permanent' }, save: FORTITUDE_34 },
  ],
  ['rune:shock', ELECTRIC_ARC],
  ['rune:shock-greater', { ...ELECTRIC_ARC, ignoresResistance: true }],
  ['rune:corrosive', { ...ARMOR_ACID, amount: { type: 'dice', count: 3, die: 'd6' } }],
  ['rune:corrosive-greater', { ...ARMOR_ACID, amount: { type: 'dice', count: 6, die: 'd6' } }],
];

describe('critical effects of the energy runes', () => {
  test.each(CRITICAL_EFFECTS)('%s does its effect on a critical hit', (slug, effect) => {
    const critical: readonly unknown[] = RUNES.filter((rune) => rune.slug === slug).flatMap(({ rules }) =>
      rules.filter(({ key }) => key === 'CriticalEffect'),
    );

    expect(critical).toStrictEqual([{ key: 'CriticalEffect', selectors: [ETCHED_DAMAGE], effect }]);
  });
});

const ROOTING_RUNES: readonly string[] = [
  'rune:rooting',
  'rune:rooting-greater',
  'rune:rooting-major',
  'rune:rooting-true',
];

describe('critical effects of the rooting family', () => {
  test.each(ROOTING_RUNES)('%s immobilizes the target and makes it clumsy for a round', (slug) => {
    const critical: readonly unknown[] = RUNES.filter((rune) => rune.slug === slug).flatMap(({ rules }) =>
      rules.filter(({ key }) => key === 'CriticalEffect'),
    );
    const round = { type: 'time', count: 1, unit: 'round' };

    expect(critical).toStrictEqual([
      {
        key: 'CriticalEffect',
        selectors: [ETCHED_DAMAGE],
        effect: { kind: 'condition', condition: 'immobilized', duration: round },
      },
      {
        key: 'CriticalEffect',
        selectors: [ETCHED_DAMAGE],
        effect: { kind: 'condition', condition: 'clumsy', value: 1, duration: round },
      },
    ]);
  });
});

describe('critical range of the keen rune', () => {
  test('a natural 19 is a critical hit for the weapon it is etched on', () => {
    const rules: readonly unknown[] = RUNES.filter((rune) => rune.slug === 'rune:keen').flatMap(
      ({ rules: own }) => own,
    );

    expect(rules).toStrictEqual([{ key: 'CriticalRange', selectors: [ETCHED_DAMAGE], natural: 19 }]);
  });
});
