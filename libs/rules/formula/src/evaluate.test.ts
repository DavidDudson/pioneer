import { describe, expect, test } from 'bun:test';

import { evaluate } from './evaluate';
import type { EvaluateFailure, EvaluateOutcome, ResolveReference } from './evaluate';
import { FormulaMessage } from './messages';
import { parseFormula } from './parse';
import { FORMULA_VALUE_MAX, FormulaText, FormulaValue, TextPosition } from './units';

/** Values for the references these tests use; anything else is unknown. */
const VALUES: Readonly<Record<string, number>> = {
  'actor.level': 5,
  'item.level': 3,
  'attr.dex.capped': 2,
  negative: -7,
  zero: 0,
  huge: FORMULA_VALUE_MAX,
};

const resolve: ResolveReference = (path) => {
  const known = VALUES[path];
  return known === undefined ? undefined : FormulaValue.parse(known);
};

function evaluated(text: string, using: ResolveReference = resolve): EvaluateOutcome {
  const parsed = parseFormula(FormulaText.parse(text));
  if (!parsed.ok) {
    throw new Error(`expected ${text} to parse, got ${parsed.error.key} at ${parsed.position}`);
  }
  return evaluate(parsed.formula, using);
}

function value(text: string): number {
  const outcome = evaluated(text);
  if (!outcome.ok) {
    throw new Error(`expected ${text} to evaluate, got ${outcome.error.key} at ${outcome.position}`);
  }
  return outcome.value;
}

function failure(text: string): EvaluateFailure {
  const outcome = evaluated(text);
  if (outcome.ok) {
    throw new Error(`expected ${text} to fail, got ${outcome.value}`);
  }
  return outcome;
}

/** Where `text` fails, as a plain number. */
const failedAt = (text: string): number => failure(text).position;

describe('evaluate', () => {
  test('arithmetic with precedence, grouping and negation', () => {
    expect(value('1 + 2 * 3')).toBe(7);
    expect(value('(1 + 2) * 3')).toBe(9);
    expect(value('10 - 4 - 3')).toBe(3);
    expect(value('-3 + 1')).toBe(-2);
    expect(value('--3')).toBe(3);
    expect(value('-0')).toBe(0);
    expect(Object.is(value('-0'), 0)).toBe(true);
  });

  test('references take the values resolve supplies', () => {
    expect(value('10 + @attr.dex.capped + @actor.level')).toBe(17);
    expect(value('@actor.level - @negative')).toBe(12);
  });

  test('division keeps fractions until a function or the final result rounds them', () => {
    expect(value('@actor.level / 2 * 2')).toBe(5);
    expect(value('floor(@actor.level / 2) * 2')).toBe(4);
    expect(value('ceil(@actor.level / 2)')).toBe(3);
    expect(value('7 / 2 + 7 / 2')).toBe(7);
  });

  test('the result rounds down, negative values included', () => {
    expect(value('@actor.level / 2')).toBe(2);
    expect(value('-5 / 2')).toBe(-3);
    expect(value('1 / 3')).toBe(0);
    expect(value('-1 / 3')).toBe(-1);
  });

  test('round, abs and sign behave as JavaScript Math does in Foundry', () => {
    expect(value('round(5 / 2)')).toBe(3);
    expect(value('round(-5 / 2)')).toBe(-2);
    expect(value('abs(@negative)')).toBe(7);
    expect(value('sign(@negative)')).toBe(-1);
    expect(value('sign(@zero)')).toBe(0);
    expect(Object.is(value('sign(-0)'), 0)).toBe(true);
  });

  test('min and max take any number of values', () => {
    expect(value('max(1, floor(@item.level / 2))')).toBe(1);
    expect(value('min(4, @actor.level, 9)')).toBe(4);
    expect(value('max(@negative)')).toBe(-7);
  });

  test('comparisons give 1 or 0', () => {
    expect(value('eq(@actor.level, 5)')).toBe(1);
    expect(value('ne(@actor.level, 5)')).toBe(0);
    expect(value('gt(@actor.level, 5)')).toBe(0);
    expect(value('gte(@actor.level, 5)')).toBe(1);
    expect(value('lt(@negative, 0)')).toBe(1);
    expect(value('lte(6, @actor.level)')).toBe(0);
    expect(value('eq(1 / 2, 2 / 4)')).toBe(1);
    expect(value('gte(@actor.level, 5) + gte(@actor.level, 10)')).toBe(1);
  });

  test('ternary takes any non-zero condition as true', () => {
    expect(value('ternary(gte(@actor.level, 15), 3, 2)')).toBe(2);
    expect(value('ternary(@negative, 1, 2)')).toBe(1);
    expect(value('ternary(@zero, 1, 2)')).toBe(2);
    expect(value('ternary(1 / 2, 1, 2)')).toBe(1);
  });

  test('ternary evaluates only the branch it takes', () => {
    expect(value('ternary(1, 4, 1 / 0)')).toBe(4);
    expect(value('ternary(0, @unknown, 4)')).toBe(4);
    const calls: string[] = [];
    const tracked: ResolveReference = (path) => {
      calls.push(path);
      return resolve(path);
    };
    expect(evaluated('ternary(@zero, @actor.level, @item.level)', tracked)).toEqual({
      ok: true,
      value: FormulaValue.parse(3),
    });
    expect(calls).toEqual(['zero', 'item.level']);
  });

  test('an unknown reference fails at the reference', () => {
    expect(failure('1 + @actor.levle')).toEqual({
      ok: false,
      error: { key: FormulaMessage.UnknownReference, params: { found: '@actor.levle', position: 5 } },
      position: TextPosition.parse(5),
    });
  });

  test('division by zero fails at the operator, fractions that round to zero included', () => {
    expect(failure('@actor.level / @zero')).toEqual({
      ok: false,
      error: { key: FormulaMessage.DivisionByZero, params: { position: 14 } },
      position: TextPosition.parse(14),
    });
    expect(failedAt('1 / (2 - 2)')).toBe(3);
    expect(failedAt('max(1, 2 / floor(1 / 2))')).toBe(10);
  });

  test('a value outside the safe integer range fails at the node that left it', () => {
    expect(failure('@huge + 1')).toEqual({
      ok: false,
      error: { key: FormulaMessage.OutOfRange, params: { maximum: FORMULA_VALUE_MAX, position: 7 } },
      position: TextPosition.parse(7),
    });
    expect(failedAt('-@huge - 1')).toBe(8);
    expect(failedAt('999999 * 999999 * 999999')).toBe(17);
    expect(value('@huge - 1 + 1')).toBe(FORMULA_VALUE_MAX);
  });

  test('the first failure in evaluation order is the one reported', () => {
    expect(failure('@nope + 1 / 0').error.key).toBe(FormulaMessage.UnknownReference);
    expect(failure('1 / 0 + @nope').error.key).toBe(FormulaMessage.DivisionByZero);
  });
});
