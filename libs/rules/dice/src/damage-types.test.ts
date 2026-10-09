import { describe, expect, test } from 'bun:test';

import { DamageGroup, DamageType, Immunity } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { applyDamage, NO_DEFENCES } from './damage';
import { DiceMessage } from './messages';
import { adjustment, amount, CRITICAL, expectedInstance, roll, target } from './testing/damage-fixtures';

describe('applyDamage: precision, bleed and critical immunity', () => {
  test('precision joins the attack instance, so its resistance covers it', () => {
    const result = applyDamage(
      roll('1d8[piercing]+1d6[precision]', [5, 3]),
      target({ resistances: [adjustment(DamageGroup.Physical, 10)] }),
    );
    expect(result.immediate).toHaveLength(1);
    expect(result.immediate[0]).toMatchObject({ type: DamageType.Piercing, rolled: 8, dealt: 8, taken: 0 });
  });

  test('a weakness to all damage counts once for an attack with precision', () => {
    const result = applyDamage(
      roll('1d8[piercing]+1d6[precision]', [5, 3]),
      target({ weaknesses: [adjustment(DamageGroup.All, 5)] }),
    );
    expect(result.taken).toBe(amount(13));
  });

  test('immunity to precision removes only the precision share', () => {
    const result = applyDamage(
      roll('1d8[piercing]+1d6[precision]', [5, 3]),
      target({ immunities: [Immunity.parse('precision')] }),
      CRITICAL,
    );
    expect(result.immediate[0]?.taken).toBe(amount(10));
    expect(result.immediate[0]?.lines).toContainEqual(
      message(DiceMessage.DamageImmune, { type: DamageType.Precision, prevented: 6 }),
    );
  });

  test('resistance to precision stops only the precision share', () => {
    const result = applyDamage(
      roll('1d8[piercing]+1d6[precision]', [5, 3]),
      target({ resistances: [adjustment(DamageType.Precision, 10)] }),
    );
    expect(result.taken).toBe(amount(5));
    expect(result.immediate[0]?.lines).toEqual([
      message(DiceMessage.DamageResistance, { value: 10, target: DamageType.Precision, prevented: 3 }),
    ]);
  });

  test('the resistance that prevents most wins, not the highest value', () => {
    const result = applyDamage(
      roll('1d8[piercing]+1d6[precision]', [5, 3]),
      target({ resistances: [adjustment(DamageType.Precision, 10), adjustment(DamageGroup.Physical, 5)] }),
    );
    expect(result.taken).toBe(amount(3));
  });

  test('resistance to precision covers all of a precision-only instance', () => {
    const result = applyDamage(
      roll('1d6[precision]', [4]),
      target({ resistances: [adjustment(DamageType.Precision, 10)] }),
    );
    expect(result.taken).toBe(amount(0));
  });

  test('a weakness to precision applies only while precision is dealt', () => {
    const weak = target({ weaknesses: [adjustment(DamageType.Precision, 4)] });
    expect(applyDamage(roll('1d8[piercing]+1d6[precision]', [5, 3]), weak).taken).toBe(amount(12));
    expect(applyDamage(roll('1d8[piercing]', [5]), weak).taken).toBe(amount(5));
  });

  test('precision with nothing to join is an instance of its own', () => {
    const result = applyDamage(roll('1d6[precision]', [4]), NO_DEFENCES);
    expect(result.immediate.map((instance) => instance.type)).toEqual([DamageType.Precision]);
    expect(result.taken).toBe(amount(4));
  });

  test('bleed is physical, so physical resistance reduces it', () => {
    const result = applyDamage(
      roll('1d4[persistent,bleed]', [2]),
      target({ resistances: [adjustment(DamageGroup.Physical, 10)] }),
    );
    expect(result.persistentTaken).toBe(amount(0));
  });

  test('a target immune to critical hits takes normal damage and is told why', () => {
    const result = applyDamage(
      roll('1d8[slashing]', [5]),
      target({ immunities: [Immunity.parse('critical-hits')] }),
      CRITICAL,
    );
    expect(result.immediate[0]).toEqual(
      expectedInstance({
        type: DamageType.Slashing,
        rolled: 5,
        dealt: 5,
        taken: 5,
        lines: [message(DiceMessage.DamageCriticalImmune)],
      }),
    );
  });
});
