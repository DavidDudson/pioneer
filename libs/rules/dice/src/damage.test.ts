import { describe, expect, test } from 'bun:test';

import { DamageGroup, DamageType, Immunity } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { applyDamage, NO_DEFENCES } from './damage';
import { DiceMessage } from './messages';
import { adjustment, amount, CRITICAL, expectedInstance, roll, target } from './testing/damage-fixtures';

describe('applyDamage', () => {
  test('without a target, every type is taken as rolled and nothing is explained', () => {
    const result = applyDamage(roll('2d6+1d4[fire]+4', [3, 5, 2]), NO_DEFENCES);
    expect(result.immediate).toEqual([
      expectedInstance({ rolled: 12, dealt: 12, taken: 12, lines: [] }),
      expectedInstance({ type: DamageType.Fire, rolled: 2, dealt: 2, taken: 2, lines: [] }),
    ]);
    expect(result.taken).toBe(amount(14));
    expect(result.persistent).toEqual([]);
    expect(result.persistentTaken).toBe(amount(0));
  });

  test('terms of the same type pool into one instance', () => {
    const result = applyDamage(roll('1d8[slashing]+4[slashing]', [6]), NO_DEFENCES);
    expect(result.immediate).toHaveLength(1);
    expect(result.immediate[0]?.dealt).toBe(amount(10));
  });

  test('a critical doubles the total, persistent included, and says so', () => {
    const result = applyDamage(roll('1d8[piercing]+2[piercing]+1d6[persistent,fire]', [5, 4]), NO_DEFENCES, CRITICAL);
    expect(result.critical).toBe(true);
    expect(result.immediate[0]).toEqual(
      expectedInstance({
        type: DamageType.Piercing,
        rolled: 7,
        dealt: 14,
        taken: 14,
        lines: [message(DiceMessage.DamageCritical, { rolled: 7, doubled: 14 })],
      }),
    );
    expect(result.persistent[0]?.dealt).toBe(amount(8));
    expect(result.persistentTaken).toBe(amount(8));
    expect(result.taken).toBe(amount(14));
  });

  test('splash joins the immediate damage of its type and is never doubled', () => {
    const result = applyDamage(roll('1d8[acid]+1[splash,acid]', [3]), NO_DEFENCES, CRITICAL);
    expect(result.immediate).toEqual([
      expectedInstance({
        type: DamageType.Acid,
        rolled: 3,
        dealt: 7,
        taken: 7,
        lines: [
          message(DiceMessage.DamageCritical, { rolled: 3, doubled: 6 }),
          message(DiceMessage.DamageSplash, { splash: 1 }),
        ],
      }),
    ]);
  });

  test('persistent damage is kept apart from immediate damage of the same type', () => {
    const result = applyDamage(roll('1d6[fire]+1d4[persistent,fire]', [4, 2]), NO_DEFENCES);
    expect(result.immediate.map((instance) => instance.taken)).toEqual([amount(4)]);
    expect(result.persistent.map((instance) => instance.taken)).toEqual([amount(2)]);
  });

  test('a share that penalties take below zero deals nothing', () => {
    const result = applyDamage(roll('1d4[cold]-5[cold]', [2]), NO_DEFENCES, CRITICAL);
    expect(result.immediate[0]).toEqual(
      expectedInstance({ type: DamageType.Cold, rolled: 0, dealt: 0, taken: 0, lines: [] }),
    );
  });

  test('immunity removes its type and leaves the others', () => {
    const result = applyDamage(
      roll('1d8[slashing]+1d6[fire]', [5, 4]),
      target({ immunities: [Immunity.parse('fire')] }),
    );
    expect(result.immediate[1]).toEqual(
      expectedInstance({
        type: DamageType.Fire,
        rolled: 4,
        dealt: 4,
        taken: 0,
        lines: [message(DiceMessage.DamageImmune, { type: DamageType.Fire, prevented: 4 })],
      }),
    );
    expect(result.taken).toBe(amount(5));
  });

  test('immunities that are not damage types change nothing', () => {
    const result = applyDamage(roll('1d6[fire]', [4]), target({ immunities: [Immunity.parse('paralyzed')] }));
    expect(result.taken).toBe(amount(4));
  });

  test('untyped damage ignores type immunities, weaknesses and resistances', () => {
    const defences = target({
      immunities: [Immunity.parse('slashing')],
      weaknesses: [adjustment(DamageType.Slashing, 5)],
      resistances: [adjustment(DamageGroup.Physical, 3)],
    });
    expect(applyDamage(roll('2d6+4', [3, 3]), defences).taken).toBe(amount(10));
  });

  test('weakness adds its value once per instance of its type', () => {
    const result = applyDamage(
      roll('1d6[cold]+1d6[cold]+1d6[fire]', [2, 3, 4]),
      target({ weaknesses: [adjustment(DamageType.Cold, 5)] }),
    );
    expect(result.immediate[0]).toEqual(
      expectedInstance({
        type: DamageType.Cold,
        rolled: 5,
        dealt: 5,
        taken: 10,
        lines: [message(DiceMessage.DamageWeakness, { value: 5, target: DamageType.Cold })],
      }),
    );
    expect(result.taken).toBe(amount(14));
  });

  test('only the highest applicable weakness applies', () => {
    const result = applyDamage(
      roll('1d8[slashing]', [4]),
      target({ weaknesses: [adjustment(DamageType.Slashing, 3), adjustment(DamageGroup.Physical, 5)] }),
    );
    expect(result.immediate[0]?.taken).toBe(amount(9));
    expect(result.immediate[0]?.lines).toEqual([
      message(DiceMessage.DamageWeakness, { value: 5, target: DamageGroup.Physical }),
    ]);
  });

  test('weakness does not apply when the instance deals no damage', () => {
    const result = applyDamage(
      roll('1d4[cold]-5[cold]', [1]),
      target({ weaknesses: [adjustment(DamageType.Cold, 5)] }),
    );
    expect(result.taken).toBe(amount(0));
  });

  test('resistance says nothing when the instance deals no damage', () => {
    const result = applyDamage(
      roll('1d4[cold]-5[cold]', [1]),
      target({ resistances: [adjustment(DamageType.Cold, 5)] }),
    );
    expect(result.immediate[0]?.lines).toEqual([]);
  });

  test('resistance removes up to its value and never below zero', () => {
    const result = applyDamage(
      roll('1d8[bludgeoning]+1d4[fire]', [6, 2]),
      target({ resistances: [adjustment(DamageGroup.Physical, 3), adjustment(DamageType.Fire, 5)] }),
    );
    expect(result.immediate).toEqual([
      expectedInstance({
        type: DamageType.Bludgeoning,
        rolled: 6,
        dealt: 6,
        taken: 3,
        lines: [message(DiceMessage.DamageResistance, { value: 3, target: DamageGroup.Physical, prevented: 3 })],
      }),
      expectedInstance({
        type: DamageType.Fire,
        rolled: 2,
        dealt: 2,
        taken: 0,
        lines: [message(DiceMessage.DamageResistance, { value: 5, target: DamageType.Fire, prevented: 2 })],
      }),
    ]);
  });

  test('resistance to all damage applies to each instance separately, untyped included', () => {
    const result = applyDamage(
      roll('1d6[fire]+1d6[cold]+3', [4, 4]),
      target({ resistances: [adjustment(DamageGroup.All, 2)] }),
    );
    expect(result.immediate.map((instance) => instance.taken)).toEqual([amount(2), amount(2), amount(1)]);
  });

  test('only the highest applicable resistance applies', () => {
    const result = applyDamage(
      roll('1d8[fire]', [8]),
      target({ resistances: [adjustment(DamageGroup.All, 2), adjustment(DamageGroup.Energy, 5)] }),
    );
    expect(result.taken).toBe(amount(3));
  });

  test('weakness applies before resistance', () => {
    const result = applyDamage(
      roll('1d4[fire]', [1]),
      target({ weaknesses: [adjustment(DamageType.Fire, 5)], resistances: [adjustment(DamageGroup.All, 3)] }),
    );
    expect(result.taken).toBe(amount(3));
  });

  test('immunity applies to persistent damage of its type too', () => {
    const result = applyDamage(roll('1d6[persistent,bleed]', [4]), target({ immunities: [Immunity.parse('bleed')] }));
    expect(result.persistentTaken).toBe(amount(0));
  });

  test('a creature from content applies as a target', () => {
    const zombie = target({
      immunities: [Immunity.parse('poison')],
      weaknesses: [adjustment(DamageType.Slashing, 5), adjustment(DamageType.Vitality, 5)],
    });
    expect(applyDamage(roll('1d8[slashing]+1d6[poison]', [3, 6]), zombie).taken).toBe(amount(8));
  });
});
