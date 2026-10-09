import { describe, expect, test } from 'bun:test';

import { DamageType } from '@pioneer/rules/sdk';
import { array, assert, constantFrom, integer, nat, oneof, option, property, record, string } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { DamageCategory, DiceExpression, KeepMode, Sign, TermKind } from './expression';
import type { Term } from './expression';
import { formatExpression } from './format';
import { parseDiceExpression } from './parse';
import { cryptoRandom } from './random';
import { rollDice } from './roll';
import { RandomSeed, seededRandom } from './testing';
import {
  DICE_COUNT_MAX,
  DiceExpressionText,
  DIE_SIZE_MAX,
  DIE_SIZE_MIN,
  DieSize,
  EXPRESSION_LENGTH_MAX,
  FLAT_VALUE_MAX,
  RollTotal,
  TERM_COUNT_MAX,
} from './units';

/** Few dice per term keeps runs fast; the parser's own limit is covered separately. */
const MAX_TEST_COUNT = 12;

const damageType = option(constantFrom(...Object.values(DamageType)), { nil: undefined });
const category = option(constantFrom(...Object.values(DamageCategory)), { nil: undefined });
const tags = record({ type: damageType, category }, { requiredKeys: [] });
const sign = constantFrom(Sign.Plus, Sign.Minus);
const size = integer({ min: DIE_SIZE_MIN, max: DIE_SIZE_MAX });
const keepMode = constantFrom(KeepMode.Highest, KeepMode.Lowest);

/** Raw shapes; `DiceExpression.parse` validates and brands them. */
const keepOf = (count: number): Arbitrary<unknown> =>
  option(record({ mode: keepMode, count: integer({ min: 1, max: count }) }), { nil: undefined });

const diceTerm = integer({ min: 1, max: MAX_TEST_COUNT }).chain((count) =>
  record({ kind: constantFrom(TermKind.Dice), sign, count: constantFrom(count), size, keep: keepOf(count), tags }),
);
const flatTerm = record({
  kind: constantFrom(TermKind.Flat),
  sign,
  value: integer({ min: 0, max: FLAT_VALUE_MAX }),
  tags,
});
const terms = array(oneof(diceTerm, flatTerm), { minLength: 1, maxLength: TERM_COUNT_MAX });
const expression: Arbitrary<DiceExpression> = terms.map((raw) => DiceExpression.parse({ terms: raw }));

/** Long expressions are valid but over the text limit, so they cannot be typed. */
const typeable = expression.filter((parsed) => formatExpression(parsed).length <= EXPRESSION_LENGTH_MAX);

interface Bounds {
  readonly min: number;
  readonly max: number;
}

function bounds(term: Term): Bounds {
  const kept = term.kind === TermKind.Dice ? (term.keep?.count ?? term.count) : 0;
  const low = term.kind === TermKind.Dice ? kept : term.value;
  const high = term.kind === TermKind.Dice ? kept * term.size : term.value;
  return term.sign === Sign.Plus ? { min: low, max: high } : { min: 0 - high, max: 0 - low };
}

function expressionBounds(parsed: DiceExpression): Bounds {
  let min = 0;
  let max = 0;
  for (const term of parsed.terms) {
    const termBounds = bounds(term);
    min += termBounds.min;
    max += termBounds.max;
  }
  return { min, max };
}

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
