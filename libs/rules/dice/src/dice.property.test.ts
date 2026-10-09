import { describe, expect, test } from 'bun:test';

import { assert, integer, nat, property, string } from 'fast-check';

import { TermKind } from './expression';
import { formatExpression } from './format';
import { parseDiceExpression } from './parse';
import { cryptoRandom } from './random';
import { rollDice } from './roll';
import { RandomSeed, seededRandom } from './testing';
import { expression, expressionBounds, size } from './testing/arbitraries';
import { DICE_COUNT_MAX, DiceExpressionText, DieSize, EXPRESSION_LENGTH_MAX, RollTotal } from './units';

/** Long expressions are valid but over the text limit, so they cannot be typed. */
const typeable = expression.filter((parsed) => formatExpression(parsed).length <= EXPRESSION_LENGTH_MAX);

describe('dice (properties)', () => {
  test('format then parse gives the same expression back', () => {
    assert(
      property(typeable, (original) => {
        expect(parseDiceExpression(formatExpression(original))).toEqual({ ok: true, expression: original });
      }),
    );
  });

  test('parsing never throws, whatever is typed', () => {
    assert(
      property(string({ maxLength: 60 }), (text) => {
        const outcome = parseDiceExpression(DiceExpressionText.parse(text));
        expect(typeof outcome.ok).toBe('boolean');
      }),
    );
  });

  test('totals stay within the expression bounds and are the sum of the terms', () => {
    assert(
      property(expression, nat(), (parsed, seed) => {
        const result = rollDice(parsed, seededRandom(RandomSeed.parse(seed)));
        const { min, max } = expressionBounds(parsed);
        let sum = 0;
        for (const term of result.terms) {
          sum += term.value;
        }
        expect(result.total).toBeGreaterThanOrEqual(min);
        expect(result.total).toBeLessThanOrEqual(max);
        expect(result.total).toBe(RollTotal.parse(sum));
      }),
    );
  });

  test('every die lands on its faces and kept dice match the keep count', () => {
    assert(
      property(expression, nat(), (parsed, seed) => {
        const result = rollDice(parsed, seededRandom(RandomSeed.parse(seed)));
        for (const term of result.terms) {
          const dice = 'dice' in term ? term.dice : [];
          const {
            count,
            size: sides,
            keep,
          } = term.term.kind === TermKind.Dice ? term.term : { count: 0, size: 0, keep: undefined };
          expect(dice).toHaveLength(count);
          expect(dice.filter((die) => die.kept)).toHaveLength(keep?.count ?? count);
          expect(dice.every((die) => die.face >= 1 && die.face <= sides)).toBe(true);
        }
      }),
    );
  });

  test('crypto faces stay on the die', () => {
    assert(
      property(size, (sides) => {
        const face = cryptoRandom.roll(DieSize.parse(sides));
        expect(face).toBeGreaterThanOrEqual(1);
        expect(face).toBeLessThanOrEqual(sides);
      }),
    );
  });

  test('every dice count up to the maximum parses', () => {
    assert(
      property(integer({ min: 1, max: DICE_COUNT_MAX }), (count) => {
        expect(parseDiceExpression(DiceExpressionText.parse(`${count}d6`)).ok).toBe(true);
      }),
    );
  });
});
