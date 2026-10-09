import { describe, expect, test } from 'bun:test';

import { BinaryOperator, NodeKind } from './ast';
import type { FormulaNode } from './ast';
import { FormulaFunction } from './functions';
import { FormulaMessage } from './messages';
import { parseFormula } from './parse';
import type { ParseFailure } from './parse';
import { printFormula } from './print';
import { references } from './references';
import { withoutPositions } from './testing/arbitraries';
import { FORMULA_LENGTH_MAX, FormulaText, NESTING_DEPTH_MAX, NODE_COUNT_MAX } from './units';

function parsed(text: string): FormulaNode {
  const outcome = parseFormula(FormulaText.parse(text));
  if (!outcome.ok) {
    throw new Error(`expected ${text} to parse, got ${outcome.error.key} at ${outcome.position}`);
  }
  return outcome.formula;
}

function failure(text: string): ParseFailure {
  const outcome = parseFormula(FormulaText.parse(text));
  if (outcome.ok) {
    throw new Error(`expected ${text} to fail`);
  }
  return outcome;
}

const canonical = (text: string): string => printFormula(parsed(text));

/** References as `path@position`, easy to compare. */
const found = (formula: FormulaNode): string[] =>
  references(formula).map((reference) => `${reference.path}@${reference.position}`);

/** `1` inside `depth` pairs of brackets: `depth` levels of nesting. */
const nested = (depth: number): string => `${'('.repeat(depth)}1${')'.repeat(depth)}`;

/** `1+1+...`: `terms` numbers and `terms - 1` additions. */
function sum(terms: number): string {
  const ones = Array.from({ length: terms }, () => '1');
  return ones.join('+');
}

describe('parseFormula', () => {
  test('a statistic base formula', () => {
    const formula = parsed('10 + @attr.dex.capped + @prof.armor + @level');
    expect(canonical('10+@attr.dex.capped+@prof.armor+@level')).toBe('10 + @attr.dex.capped + @prof.armor + @level');
    expect(found(formula)).toEqual(['attr.dex.capped@6', 'prof.armor@25', 'level@39']);
  });

  test('Foundry-style value with nested calls', () => {
    expect(withoutPositions(parsed('max(1, floor(@actor.level / 2))'))).toEqual({
      kind: NodeKind.Call,
      name: FormulaFunction.Max,
      args: [
        { kind: NodeKind.Number, value: 1 },
        {
          kind: NodeKind.Call,
          name: FormulaFunction.Floor,
          args: [
            {
              kind: NodeKind.Binary,
              operator: BinaryOperator.Divide,
              left: { kind: NodeKind.Reference, path: 'actor.level' },
              right: { kind: NodeKind.Number, value: 2 },
            },
          ],
        },
      ],
    });
  });

  test('ternary and comparisons as Foundry writes them', () => {
    expect(canonical('ternary(gte(@actor.level,10),2,1)')).toBe('ternary(gte(@actor.level, 10), 2, 1)');
  });

  test('precedence, associativity and unary minus', () => {
    expect(canonical('1 + 2 * 3')).toBe('1 + 2 * 3');
    expect(canonical('(1 + 2) * 3')).toBe('(1 + 2) * 3');
    expect(canonical('((1 - 2) - 3)')).toBe('1 - 2 - 3');
    expect(canonical('1 - (2 - 3)')).toBe('1 - (2 - 3)');
    expect(canonical('8 / (4 / 2)')).toBe('8 / (4 / 2)');
    expect(canonical('-(@level + 1)')).toBe('-(@level + 1)');
    expect(canonical('2 - -@level')).toBe('2 - -@level');
    expect(withoutPositions(parsed('-2 * 3'))).toMatchObject({ kind: NodeKind.Binary, operator: '*' });
  });

  test('nodes point at where they start: operators at the operator, calls at the name', () => {
    const formula = parsed(' floor( @level / 2 )');
    expect(formula).toMatchObject({ position: 2, args: [{ position: 16 }] });
  });

  test('hyphens belong to the reference, as in Foundry paths', () => {
    expect(found(parsed('@level-1'))).toEqual(['level-1@1']);
    expect(found(parsed('@level - 1'))).toEqual(['level@1']);
  });

  test.each([
    ['', FormulaMessage.Empty, 1],
    ['   ', FormulaMessage.Empty, 1],
    ['1 + #', FormulaMessage.UnexpectedCharacter, 5],
    ['1 + 😀', FormulaMessage.UnexpectedCharacter, 5],
    ['1.5', FormulaMessage.UnexpectedCharacter, 2],
    ['1 +', FormulaMessage.UnexpectedEnd, 4],
    ['(1 + 2', FormulaMessage.UnexpectedEnd, 7],
    ['1 2', FormulaMessage.UnexpectedToken, 3],
    ['1 + * 2', FormulaMessage.UnexpectedToken, 5],
    ['+1', FormulaMessage.UnexpectedToken, 1],
    ['max(1,)', FormulaMessage.UnexpectedToken, 7],
    ['max(1 2)', FormulaMessage.UnexpectedToken, 7],
    ['1000000', FormulaMessage.NumberTooLarge, 1],
    ['2 * @', FormulaMessage.InvalidReference, 5],
    ['@actor.', FormulaMessage.InvalidReference, 1],
    ['@a..b', FormulaMessage.InvalidReference, 1],
    ['level + 1', FormulaMessage.UnknownFunction, 1],
    ['sqrt(4)', FormulaMessage.UnknownFunction, 1],
    ['1 + floor', FormulaMessage.NotCalled, 5],
    ['floor(1, 2)', FormulaMessage.ArgumentCount, 1],
    ['ternary(1, 2)', FormulaMessage.ArgumentCount, 1],
    ['max()', FormulaMessage.ArgumentCountAtLeast, 1],
  ])('%p fails with %s at %d', (text, key, position) => {
    const outcome = failure(text);
    expect(outcome.error.key).toBe(key);
    expect(Number(outcome.position)).toBe(position);
  });

  test('errors carry what was found and where, for the message', () => {
    expect(failure('1 + floor').error).toEqual({
      key: FormulaMessage.NotCalled,
      params: { found: 'floor', position: 5 },
    });
    expect(failure('floor(1, 2)').error.params).toEqual({ name: 'floor', expected: 1, given: 2, position: 1 });
  });

  test('length limit', () => {
    const longest = `@${'a'.repeat(FORMULA_LENGTH_MAX - 1)}`;
    expect(parsed(longest).kind).toBe(NodeKind.Reference);
    expect(failure(`${longest} `)).toMatchObject({ error: { key: FormulaMessage.TooLong }, position: 501 });
  });

  test('nesting limit counts groups, call arguments and negations', () => {
    expect(parsed(nested(NESTING_DEPTH_MAX)).kind).toBe(NodeKind.Number);
    expect(failure(nested(NESTING_DEPTH_MAX + 1))).toMatchObject({
      error: { key: FormulaMessage.TooDeep },
      position: NESTING_DEPTH_MAX + 1,
    });
    expect(parsed(`${'-'.repeat(NESTING_DEPTH_MAX)}1`).kind).toBe(NodeKind.Negate);
    expect(failure(`${'-'.repeat(NESTING_DEPTH_MAX + 1)}1`).error.key).toBe(FormulaMessage.TooDeep);
    const calls = `${'abs('.repeat(NESTING_DEPTH_MAX + 1)}1${')'.repeat(NESTING_DEPTH_MAX + 1)}`;
    expect(failure(calls).error.key).toBe(FormulaMessage.TooDeep);
  });

  test('node limit', () => {
    const fits = Math.floor((NODE_COUNT_MAX + 1) / 2);
    expect(parsed(sum(fits)).kind).toBe(NodeKind.Binary);
    expect(failure(sum(fits + 1)).error.key).toBe(FormulaMessage.TooManyNodes);
  });
});
