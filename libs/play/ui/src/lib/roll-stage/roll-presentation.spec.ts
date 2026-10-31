import { DamageTone } from '@pioneer/frontier';
import { DiceExpressionText, DieFace, parseDiceExpression, rollDice } from '@pioneer/rules/dice';
import type { RollResult } from '@pioneer/rules/dice';
import { scriptedRandom } from '@pioneer/rules/dice/testing';
import { describe, expect, it } from 'vitest';

import { presentRoll } from './roll-presentation';

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

  it('colours the dice and the pill by damage type and names the type', () => {
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
});
