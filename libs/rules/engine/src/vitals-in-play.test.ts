import { describe, expect, test } from 'bun:test';

import { PredicateFacts } from '@pioneer/rules/predicate';
import { DamageType, FastHealingType, HitPoints, RollOption, Size } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, PLAYER_CORE_PROFICIENCY_BONUS } from '@pioneer/rules/sdk/testing';

import { StatisticInputsJson } from './statistic-inputs';
import { inPlay } from './testing';
import { vitalsInPlay } from './vitals-in-play';
import type { VitalsInPlay } from './vitals-in-play';

const scope = {
  statistics: { definitions: [], proficiencyBonus: PLAYER_CORE_PROFICIENCY_BONUS },
  character: StatisticInputsJson.parse({
    level: 5,
    attributes: { str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0 },
    ranks: {},
  }),
  size: Size.Medium,
};
const facts = new PredicateFacts([RollOption.parse('self:effect:rage')], CORE_NAMESPACES);

/** The vitals of elements, each `[element, entry]`, in that order. */
function vitalsOf(placed: readonly (readonly [object, string])[]): VitalsInPlay {
  const rules = placed.map(([element, entry], rule) => inPlay(element, entry, { rule }));
  return vitalsInPlay({ rules, facts }, scope);
}

describe('vitalsInPlay: recovery', () => {
  test('a FastHealing element gives fast healing with its origin and what switches it off', () => {
    const element = { key: 'FastHealing', value: 5, deactivatedBy: ['fire'] };

    const { recovery } = vitalsOf([[element, 'troll-blood']]);

    expect(recovery).toEqual([
      {
        type: FastHealingType.FastHealing,
        amount: HitPoints.parse(5),
        deactivatedBy: [DamageType.Fire],
        origins: [inPlay(element, 'troll-blood').origin],
      },
    ]);
  });

  test('regeneration and fast healing are kept apart, fast healing first', () => {
    const { recovery } = vitalsOf([
      [{ key: 'FastHealing', value: 10, type: 'regeneration' }, 'a'],
      [{ key: 'FastHealing', value: 3 }, 'b'],
    ]);

    expect(recovery.map(({ type, amount }) => [type, Number(amount)])).toEqual([
      ['fast-healing', 3],
      ['regeneration', 10],
    ]);
  });

  test('of one kind the highest counts and equal ones share their origins', () => {
    const { recovery } = vitalsOf([
      [{ key: 'FastHealing', value: 5 }, 'a'],
      [{ key: 'FastHealing', value: 8 }, 'b'],
      [{ key: 'FastHealing', value: 8 }, 'c'],
    ]);

    expect(recovery).toHaveLength(1);
    expect(Number(recovery[0]?.amount)).toBe(8);
    expect(recovery[0]?.origins).toHaveLength(2);
  });

  test('a formula reads the character, and a value below 1 gives nothing', () => {
    const { recovery } = vitalsOf([
      [{ key: 'FastHealing', value: '@level' }, 'a'],
      [{ key: 'FastHealing', value: 0, type: 'regeneration' }, 'b'],
    ]);

    expect(recovery.map(({ amount }) => Number(amount))).toEqual([5]);
  });

  test('an element whose predicate fails gives nothing', () => {
    const calm = { key: 'FastHealing', value: 5, predicate: ['self:effect:calm'] };
    const raging = { key: 'FastHealing', value: 4, predicate: ['self:effect:rage'] };

    expect(vitalsOf([[calm, 'a']]).recovery).toEqual([]);
    expect(vitalsOf([[raging, 'a']]).recovery.map(({ amount }) => Number(amount))).toEqual([4]);
  });
});

describe('vitalsInPlay: temporary Hit Points', () => {
  test('none without a TempHP element', () => {
    expect(vitalsOf([]).temporaryHitPoints).toBeUndefined();
  });

  test('the highest TempHP counts rather than the sum', () => {
    const { temporaryHitPoints } = vitalsOf([
      [{ key: 'TempHP', value: 5 }, 'a'],
      [{ key: 'TempHP', value: 9 }, 'b'],
    ]);

    expect(Number(temporaryHitPoints?.amount)).toBe(9);
    expect(temporaryHitPoints?.origins).toHaveLength(1);
  });
});

describe('vitalsInPlay: size', () => {
  test('none without a CreatureSize element', () => {
    expect(vitalsOf([]).size).toBeUndefined();
  });

  test('a named size sets it, with that size’s reach', () => {
    const { size } = vitalsOf([[{ key: 'CreatureSize', value: 'large' }, 'enlarge']]);

    expect(size).toMatchObject({ size: 'large', base: 'medium', reach: 10, resizeEquipment: false });
  });

  test('steps grow and shrink, and growing stops at maximumSize', () => {
    expect(vitalsOf([[{ key: 'CreatureSize', value: 2 }, 'a']]).size?.size).toBe('huge');
    expect(vitalsOf([[{ key: 'CreatureSize', value: -1 }, 'a']]).size?.size).toBe('small');
    expect(vitalsOf([[{ key: 'CreatureSize', value: 3, maximumSize: 'large' }, 'a']]).size?.size).toBe('large');
  });

  test('steps never leave the sizes, and a maximum below the current size does not shrink', () => {
    expect(vitalsOf([[{ key: 'CreatureSize', value: -3 }, 'a']]).size?.size).toBe('tiny');
    expect(vitalsOf([[{ key: 'CreatureSize', value: 1, maximumSize: 'small' }, 'a']]).size?.size).toBe('medium');
  });

  test('a reach overrides or adds to the size’s, and equipment resizing is any element’s', () => {
    const overridden = vitalsOf([[{ key: 'CreatureSize', value: 'large', reach: { override: 15 } }, 'a']]);

    expect(Number(overridden.size?.reach)).toBe(15);
    const { size } = vitalsOf([
      [{ key: 'CreatureSize', value: 'large', reach: { add: 5 } }, 'a'],
      [{ key: 'CreatureSize', value: 1, resizeEquipment: true }, 'b'],
    ]);

    expect(size).toMatchObject({ size: 'huge', reach: 20, resizeEquipment: true });
    expect(size?.origins).toHaveLength(2);
  });
});
