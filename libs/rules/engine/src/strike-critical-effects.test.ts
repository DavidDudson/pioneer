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

    expect(effects).toEqual([
      { effect: frost.effect, trigger: undefined, reaction: undefined, origin: inPlay(frost, 'frost').origin },
    ]);
  });

  test('a trigger and a reaction come through to the Strike', () => {
    const pacifying = {
      key: 'CriticalEffect',
      selectors: ['strike-damage'],
      trigger: 'hit',
      reaction: true,
      effect: {
        kind: 'pacify',
        penalty: -2,
        duration: { type: 'time', count: 1, unit: 'minute' },
        save: { statistic: 'will', dc: 20 },
      },
    };

    const effects: readonly unknown[] | undefined = strikeOf([[pacifying, 'pacifying']])?.criticalEffects;

    expect(effects).toEqual([
      { effect: pacifying.effect, trigger: 'hit', reaction: true, origin: inPlay(pacifying, 'pacifying').origin },
    ]);
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

describe('Strike critical range from rule elements', () => {
  const keen = { key: 'CriticalRange', selectors: ['strike-attack-roll'], natural: 19 };

  test('a CriticalRange reaching the attack roll is on the Strike, with its origin', () => {
    const range: unknown = strikeOf([[keen, 'keen']])?.criticalRange;

    expect(range).toEqual({ natural: 19, origin: inPlay(keen, 'keen').origin });
  });

  test('the lowest of several ranges is the Strike critical range', () => {
    const sharper = { ...keen, natural: 18 };
    const range: unknown = strikeOf([
      [keen, 'a'],
      [sharper, 'b'],
    ])?.criticalRange;

    expect(range).toEqual({ natural: 18, origin: inPlay(sharper, 'b').origin });
  });

  test('a CriticalRange for other rolls, or whose predicate fails, is not on the Strike', () => {
    const elsewhere = { ...keen, selectors: ['perception'] };
    const calm = { ...keen, predicate: ['self:effect:calm'] };

    expect(
      strikeOf([
        [elsewhere, 'a'],
        [calm, 'b'],
      ])?.criticalRange,
    ).toBeUndefined();
  });
});
