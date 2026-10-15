import { describe, expect, test } from 'bun:test';

import { RuleElement } from '@pioneer/rules/sdk';

import { withActiveEffect } from './translate-active-effects';

/** Foundry's `ActiveEffectLike` with `fields`. */
function effect(fields: object): object {
  return { key: 'ActiveEffectLike', ...fields };
}

const REACH = 'system.attributes.reach.base';
const DYING_MAX = 'system.attributes.dying.max';

describe('withActiveEffect on a number Pioneer derives', () => {
  test.each([
    ['Bendy Arm Mutagen (greater)', 10],
    ['Bendy Arm Mutagen (lesser)', 5],
  ])('%s adds to reach', (_name, value) => {
    const translated = withActiveEffect(effect({ mode: 'add', path: REACH, phase: 'afterDerived', value }));

    expect(translated).toEqual({ key: 'Change', selector: 'reach', mode: 'add', value });
    expect(RuleElement.safeParse(translated).success).toBe(true);
  });

  test("Mortalis Coin's upgrade is a Change on the dying limit", () => {
    const translated = withActiveEffect(effect({ mode: 'upgrade', path: DYING_MAX, value: 5 }));

    expect(translated).toEqual({ key: 'Change', selector: 'dying-max', mode: 'upgrade', value: 5 });
    expect(RuleElement.safeParse(translated).success).toBe(true);
  });

  test('its predicate is kept', () => {
    const predicate = ['mortalis-coin'];

    expect(withActiveEffect(effect({ mode: 'upgrade', path: DYING_MAX, value: 5, predicate }))).toEqual({
      key: 'Change',
      selector: 'dying-max',
      mode: 'upgrade',
      value: 5,
      predicate,
    });
  });

  test.each([
    ['a Foundry flag', effect({ mode: 'add', path: 'flags.system.rageTempHP', phase: 'beforeDerived', value: 10 })],
    ['a flag with a formula', effect({ mode: 'override', path: 'flags.system.x', value: 'floor(@item.level/2)' })],
    ['a boolean', effect({ mode: 'override', path: 'system.attributes.flanking.flankable', value: false })],
    ['a formula value', effect({ mode: 'add', path: REACH, value: '@actor.level' })],
    ['an unknown mode', effect({ mode: 'set', path: REACH, value: 5 })],
    ['a path without a statistic', effect({ mode: 'add', path: 'system.attributes.hp.recoveryAddend', value: 5 })],
    ['another key', { ...effect({ mode: 'add', path: REACH, value: 5 }), key: 'FlatModifier' }],
  ])('%s is left as Foundry wrote it', (_name, raw) => {
    expect(withActiveEffect(raw)).toBe(raw);
  });
});

describe('withActiveEffect on a skill rank', () => {
  test('is still a Proficiency element', () => {
    const raw = effect({ mode: 'upgrade', path: 'system.skills.athletics.rank', value: 1 });

    expect(withActiveEffect(raw)).toEqual({ key: 'Proficiency', selector: 'skill:athletics', rank: 'trained' });
  });
});
