import { describe, expect, test } from 'bun:test';

import { parseDiceExpression } from './parse';
import { rollDice } from './roll';
import type { RollResult } from './roll';
import { scriptedRandom } from './testing';
import { DiceExpressionText, DieFace, RollTotal } from './units';

function roll(text: string, faces: readonly number[]): RollResult {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(outcome.error.key);
  }
  return rollDice(outcome.expression, scriptedRandom(faces.map((face) => DieFace.parse(face))));
}

describe('rollDice', () => {
  test('adds dice and modifiers, keeping every die', () => {
    const result = roll('2d6+1d4[fire]+4', [3, 5, 2]);
    expect(result.total).toBe(RollTotal.parse(14));
    expect(result.terms.map((term) => term.value)).toEqual([8, 2, 4].map((value) => RollTotal.parse(value)));
    expect(result.terms[0]).toMatchObject({
      dice: [
        { face: 3, kept: true },
        { face: 5, kept: true },
      ],
    });
  });

  test('kh keeps the highest dice, the first of equal faces on ties', () => {
    const result = roll('4d6kh3', [4, 1, 6, 4]);
    expect(result.total).toBe(RollTotal.parse(14));
    expect(result.terms[0]).toMatchObject({
      dice: [
        { face: 4, kept: true },
        { face: 1, kept: false },
        { face: 6, kept: true },
        { face: 4, kept: true },
      ],
    });
  });

  test('kl keeps the lowest dice', () => {
    const result = roll('2d20kl', [15, 15]);
    expect(result.terms[0]).toMatchObject({
      dice: [
        { face: 15, kept: true },
        { face: 15, kept: false },
      ],
    });
  });

  test('negative terms subtract', () => {
    expect(roll('1d20-1d4-2', [10, 3]).total).toBe(RollTotal.parse(5));
  });
});
