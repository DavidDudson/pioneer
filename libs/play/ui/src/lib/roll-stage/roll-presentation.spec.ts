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
    expect(shown.tone).toBeUndefined();
    expect(shown.damageTypeKey).toBeUndefined();
  });

  it('colours the dice and the pill by damage type and names the type', () => {
    const shown = presentRoll(2, 'Fireball', roll('6d6[fire]', [1, 2, 3, 4, 5, 6]));
    expect(shown.groups).toStrictEqual([{ notation: '6d6@1,2,3,4,5,6', tone: DamageTone.Fire }]);
    expect(shown.tone).toBe(DamageTone.Fire);
    expect(shown.damageTypeKey).toBe('roll.damageType.fire');
  });

  it('colours each term of a mixed roll by its own type', () => {
    const shown = presentRoll(3, 'Flaming sword', roll('1d8[slashing]+1d6[fire]', [4, 2]));
    expect(shown.groups.map(({ tone }) => tone)).toStrictEqual([DamageTone.Physical, DamageTone.Fire]);
    expect(shown.tone).toBe(DamageTone.Physical);
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
