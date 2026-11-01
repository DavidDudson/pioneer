import { describe, expect, test } from 'bun:test';

import { DamageAdjustment, DamageException, DamageGroup, DamageType } from '@pioneer/rules/sdk';
import { message } from '@pioneer/shared/kernel';

import { applyDamage } from './damage';
import { DiceMessage } from './messages';
import { amount, expectedInstance, roll, target } from './testing/damage-fixtures';

const MATERIALS = ['silver', 'cold-iron', 'adamantine'].map((material) => DamageException.parse(material));

/** A resistance of 5 to physical damage, except from the damage that counts as `exceptions`. */
function resistantExcept(...exceptions: readonly string[]): DamageAdjustment {
  return DamageAdjustment.parse({ type: DamageGroup.Physical, value: 5, exceptions });
}

describe('damage that counts as a material or property rune', () => {
  test.each(MATERIALS)('%s skips a resistance that excepts it', (material) => {
    const defences = target({ resistances: [resistantExcept(material)] });

    const result = applyDamage(roll('1d8[slashing]', [7]), defences, { critical: false, counts: [material] });

    expect(result.immediate).toEqual([
      expectedInstance({ type: DamageType.Slashing, rolled: 7, dealt: 7, taken: 7, lines: [] }),
    ]);
  });

  test.each(MATERIALS)('damage not counting as %s is resisted', (material) => {
    const defences = target({ resistances: [resistantExcept(material)] });

    const result = applyDamage(roll('1d8[slashing]', [7]), defences);

    expect(result.taken).toBe(amount(2));
  });

  test('another material does not skip the resistance', () => {
    const coldIron = DamageException.parse('cold-iron');
    const defences = target({ resistances: [resistantExcept('silver')] });

    const result = applyDamage(roll('1d8[slashing]', [7]), defences, { critical: false, counts: [coldIron] });

    expect(result.taken).toBe(amount(2));
  });

  test('a property rune the damage counts as skips the resistance that excepts it', () => {
    const ghostTouch = DamageException.parse('ghost-touch');
    const defences = target({ resistances: [resistantExcept('ghost-touch')] });

    const result = applyDamage(roll('1d8[slashing]', [7]), defences, { critical: false, counts: [ghostTouch] });

    expect(result.taken).toBe(amount(7));
  });

  test('a weakness that excepts the material does not add its value', () => {
    const weakness = DamageAdjustment.parse({ type: DamageType.Fire, value: 5, exceptions: ['silver'] });
    const silver = DamageException.parse('silver');

    const resisted = applyDamage(roll('1d6[fire]', [4]), target({ weaknesses: [weakness] }), {
      critical: false,
      counts: [silver],
    });
    const plain = applyDamage(roll('1d6[fire]', [4]), target({ weaknesses: [weakness] }));

    expect([resisted.taken, plain.taken]).toEqual([amount(4), amount(9)]);
    expect(plain.immediate[0]?.lines).toEqual([
      message(DiceMessage.DamageWeakness, { value: 5, target: DamageType.Fire }),
    ]);
  });

  test('the cheapest resistance that applies is used when one is excepted', () => {
    const defences = target({
      resistances: [resistantExcept('silver'), DamageAdjustment.parse({ type: DamageType.Slashing, value: 2 })],
    });
    const silver = DamageException.parse('silver');

    const result = applyDamage(roll('1d8[slashing]', [7]), defences, { critical: false, counts: [silver] });

    expect(result.taken).toBe(amount(5));
  });
});
