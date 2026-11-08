import { describe, expect, test } from 'bun:test';

import { inPlay } from './testing';
import { strikeOf } from './testing/strike-test-fixtures';

describe('Strike critical effects from rule elements', () => {
  const frost = {
    key: 'CriticalEffect',
    selectors: ['strike-damage'],
    effect: {
      kind: 'condition',
      condition: 'slowed',
      value: 1,
      duration: { type: 'next-turn-end' },
      save: { statistic: 'fortitude', dc: 24 },
    },
  };

  test('a CriticalEffect reaching the damage roll is on the Strike, with its effect and origin', () => {
    const strike = strikeOf([[frost, 'frost']]);

    const effects: readonly unknown[] | undefined = strike?.criticalEffects;

    expect(effects).toEqual([{ effect: frost.effect, origin: inPlay(frost, 'frost').origin }]);
  });

  test('a CriticalEffect for other rolls, or whose predicate fails, is not on the Strike', () => {
    const elsewhere = { ...frost, selectors: ['perception'] };
    const calm = { ...frost, predicate: ['self:effect:calm'] };

    expect(
      strikeOf([
        [elsewhere, 'a'],
        [calm, 'b'],
      ])?.criticalEffects,
    ).toEqual([]);
  });
});
