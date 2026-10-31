import { describe, expect, test } from 'bun:test';

import { DamageType, DegreeOfSuccess, Immunity } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { applyDamage, NO_DEFENCES } from './damage';
import { DiceMessage } from './messages';
import { adjustment, amount, roll, target } from './testing/damage-fixtures';

function takenFor(save: DegreeOfSuccess, notation = '1d8[fire]', faces = [7]): number {
  return applyDamage(roll(notation, faces), NO_DEFENCES, { critical: false, save }).taken;
}

describe('applyDamage with a basic save', () => {
  test.each([
    [DegreeOfSuccess.CriticalSuccess, 0],
    [DegreeOfSuccess.Success, 3],
    [DegreeOfSuccess.Failure, 7],
    [DegreeOfSuccess.CriticalFailure, 14],
  ] as const)('%s takes %d of 7', (save, expected) => {
    expect(takenFor(save)).toBe(amount(expected));
  });

  test('halves each damage type on its own, rounding down', () => {
    const result = applyDamage(roll('1d6[fire]+1d6[cold]', [3, 5]), NO_DEFENCES, {
      critical: false,
      save: DegreeOfSuccess.Success,
    });
    expect(result.immediate.map((instance) => instance.taken)).toEqual([amount(1), amount(2)]);
  });

  test('persistent damage follows the degree too', () => {
    const result = applyDamage(roll('1d6[persistent,fire]', [5]), NO_DEFENCES, {
      critical: false,
      save: DegreeOfSuccess.CriticalFailure,
    });
    expect(result.persistentTaken).toBe(amount(10));
  });

  test('says what the degree did', () => {
    const result = applyDamage(roll('1d8[fire]', [7]), NO_DEFENCES, { critical: false, save: DegreeOfSuccess.Success });
    expect(result.immediate[0]?.lines).toEqual([
      message(DiceMessage.DamageBasicSave, { degree: DegreeOfSuccess.Success, before: 7, after: 3 }),
    ]);
  });

  test('resistance applies after the multiplier', () => {
    const resistant = target({ resistances: [adjustment(DamageType.Fire, 2)] });
    const result = applyDamage(roll('1d8[fire]', [8]), resistant, { critical: false, save: DegreeOfSuccess.Success });
    expect(result.taken).toBe(amount(2));
  });

  test('weakness applies after the multiplier, and not at all to damage the save removed', () => {
    const weak = target({ weaknesses: [adjustment(DamageType.Fire, 3)] });
    const half = applyDamage(roll('1d8[fire]', [8]), weak, { critical: false, save: DegreeOfSuccess.Success });
    const none = applyDamage(roll('1d8[fire]', [8]), weak, { critical: false, save: DegreeOfSuccess.CriticalSuccess });
    expect(half.taken).toBe(amount(7));
    expect(none.taken).toBe(amount(0));
  });

  test('immunity still removes the scaled damage', () => {
    const immune = target({ immunities: [Immunity.parse(DamageType.Fire)] });
    const result = applyDamage(roll('1d8[fire]', [8]), immune, {
      critical: false,
      save: DegreeOfSuccess.CriticalFailure,
    });
    expect(result.taken).toBe(amount(0));
  });

  test('without a save, damage is unchanged', () => {
    expect(applyDamage(roll('1d8[fire]', [7]), NO_DEFENCES).taken).toBe(amount(7));
  });
});
