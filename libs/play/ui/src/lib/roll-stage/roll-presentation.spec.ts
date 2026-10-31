import { DamageTone } from '@pioneer/frontier';
import {
  applyDamage,
  DiceExpressionText,
  DieFace,
  NO_DEFENCES,
  parseDiceExpression,
  rollDice,
} from '@pioneer/rules/dice';
import type { RollResult } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { DegreeOfSuccess } from '@pioneer/rules/sdk';
import { describe, expect, it } from 'vitest';

import { Natural, presentRoll, withSave } from './roll-presentation';

/** Rolls `text` with the dice landing on `faces`, in order. */
function roll(text: string, faces: readonly number[]): RollResult {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(`${text} does not parse`);
  }
  return rollDice(outcome.expression, scriptedRandom(faces.map((face) => DieFace.parse(face))));
}

describe(presentRoll, () => {
  it('has the dice land on the faces the engine rolled, and keeps the total', () => {
    const shown = presentRoll(1, 'Perception', roll('2d10+5', [1, 10]));
    expect(shown.total).toBe(16);
    expect(shown.groups).toStrictEqual([{ notation: '2d10@1,10', tone: undefined }]);
    expect(shown.lines).toStrictEqual([{ total: 16, tone: undefined, typeKey: undefined }]);
  });

  it('colours the dice and the toast by damage type and names the type', () => {
    const shown = presentRoll(2, 'Fireball', roll('6d6[fire]', [1, 2, 3, 4, 5, 6]));
    expect(shown.groups).toStrictEqual([{ notation: '6d6@1,2,3,4,5,6', tone: DamageTone.Fire }]);
    expect(shown.lines).toStrictEqual([{ total: 21, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' }]);
  });

  it('colours each term of a mixed roll by its own type', () => {
    const shown = presentRoll(3, 'Flaming sword', roll('1d8[slashing]+1d6[fire]', [4, 2]));
    expect(shown.groups.map(({ tone }) => tone)).toStrictEqual([DamageTone.Physical, DamageTone.Fire]);
    expect(shown.lines.map(({ tone }) => tone)).toStrictEqual([DamageTone.Physical, DamageTone.Fire]);
  });

  it('gives each damage type its own line, summed across dice and flat terms', () => {
    const shown = presentRoll(6, 'Longsword', roll('2d8[slashing]+10[fire]+3[slashing]+1d6[fire]', [4, 5, 2]));
    expect(shown.lines).toStrictEqual([
      { total: 12, tone: DamageTone.Physical, typeKey: 'roll.damageType.slashing' },
      { total: 12, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
    ]);
    expect(shown.total).toBe(24);
  });

  it('counts a flat typed term as a line of its own', () => {
    const shown = presentRoll(7, 'Spark', roll('1d6[fire]+10[force]', [3]));
    expect(shown.lines).toStrictEqual([
      { total: 3, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
      { total: 10, tone: DamageTone.Force, typeKey: 'roll.damageType.force' },
    ]);
  });

  it('subtracts a negative term from its own type', () => {
    const shown = presentRoll(8, 'Resisted', roll('2d6[fire]-1[fire]', [3, 4]));
    expect(shown.lines).toStrictEqual([{ total: 6, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' }]);
  });

  it('lands dropped dice too, so the table shows every die thrown', () => {
    const shown = presentRoll(4, 'Roll', roll('4d6kh3', [1, 5, 6, 2]));
    expect(shown.groups).toStrictEqual([{ notation: '4d6@1,5,6,2', tone: undefined }]);
  });

  it('leaves a flat roll with no dice to throw', () => {
    const shown = presentRoll(5, 'Flat', roll('7', []));
    expect(shown.groups).toStrictEqual([]);
    expect(shown.total).toBe(7);
  });

  it('shows what a basic save left of each type beside what the dice came to', () => {
    const rolled = roll('1d6[fire]+1d6[cold]+1d6[persistent,fire]', [5, 3, 4]);
    const damage = applyDamage(rolled, NO_DEFENCES, { critical: false, save: DegreeOfSuccess.Success });
    const shown = withSave(presentRoll(9, 'Burning ground', rolled), damage);
    expect(shown.lines).toStrictEqual([
      { total: 2, unadjusted: 5, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
      { total: 1, unadjusted: 3, tone: DamageTone.Cold, typeKey: 'roll.damageType.cold' },
      { total: 2, unadjusted: 4, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
    ]);
  });

  it('shows no dice total beside a type the save left whole', () => {
    const rolled = roll('1d6[fire]', [5]);
    const damage = applyDamage(rolled, NO_DEFENCES, { critical: false, save: DegreeOfSuccess.Failure });
    expect(withSave(presentRoll(10, 'Spark', rolled), damage).lines).toStrictEqual([
      { total: 5, unadjusted: undefined, tone: DamageTone.Fire, typeKey: 'roll.damageType.fire' },
    ]);
  });

  describe('a natural die', () => {
    it.each([
      [20, Natural.High],
      [1, Natural.Low],
    ] as const)('a d20 landing on %d is a %s natural', (face, natural) => {
      expect(presentRoll(11, 'Strike', roll('1d20+7', [face])).natural).toBe(natural);
    });

    it('is no natural for any other face', () => {
      expect(presentRoll(12, 'Strike', roll('1d20+7', [19])).natural).toBeUndefined();
      expect(presentRoll(13, 'Strike', roll('1d20+7', [2])).natural).toBeUndefined();
    });

    it('goes by the d20 that counted when fortune kept the other', () => {
      expect(presentRoll(14, 'Strike', roll('2d20kh1+7', [1, 20])).natural).toBe(Natural.High);
      expect(presentRoll(15, 'Strike', roll('2d20kl1+7', [1, 20])).natural).toBe(Natural.Low);
    });

    it('is no natural for a roll with no d20', () => {
      expect(presentRoll(16, 'Damage', roll('1d8[fire]', [1])).natural).toBeUndefined();
    });
  });
});
