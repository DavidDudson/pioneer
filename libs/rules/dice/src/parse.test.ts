import { describe, expect, test } from 'bun:test';

import { DamageCategory, DiceExpression, KeepMode, Sign, TermKind } from './expression';
import { formatExpression } from './format';
import { DiceMessage } from './messages';
import { parseDiceExpression } from './parse';
import type { ParseFailure } from './parse';
import { DiceExpressionText, TextPosition } from './units';

function parsed(text: string): DiceExpression {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (!outcome.ok) {
    throw new Error(`expected ${text} to parse, got ${outcome.error.key}`);
  }
  return outcome.expression;
}

function failure(text: string): ParseFailure {
  const outcome = parseDiceExpression(DiceExpressionText.parse(text));
  if (outcome.ok) {
    throw new Error(`expected ${text} to fail`);
  }
  return outcome;
}

describe('parseDiceExpression', () => {
  test('a check: d20 plus a modifier', () => {
    expect(parsed('1d20+7')).toEqual(
      DiceExpression.parse({
        terms: [
          { kind: TermKind.Dice, sign: Sign.Plus, count: 1, size: 20, tags: {} },
          { kind: TermKind.Flat, sign: Sign.Plus, value: 7, tags: {} },
        ],
      }),
    );
  });

  test('typed damage: tags belong to the term before them', () => {
    expect(parsed('2d6+1d4[fire]+4').terms.map((term) => term.tags)).toEqual([{}, { type: 'fire' }, {}]);
  });

  test('keep highest and lowest, with the count defaulting to one', () => {
    const [highest, lowest] = parsed('4d6kh3+2d20kl').terms;
    expect(highest).toMatchObject({ keep: { mode: KeepMode.Highest, count: 3 } });
    expect(lowest).toMatchObject({ keep: { mode: KeepMode.Lowest, count: 1 } });
  });

  test('persistent and splash damage, case and spacing ignored', () => {
    const [persistent, splash] = parsed(' 1D6 [ Persistent , Bleed ] + 1 [splash,acid] ').terms;
    expect(persistent?.tags).toEqual({ category: DamageCategory.Persistent, type: 'bleed' });
    expect(splash?.tags).toEqual({ category: DamageCategory.Splash, type: 'acid' });
  });

  test('a leading minus and a bare die', () => {
    expect(parsed('-2+d8')).toEqual(
      DiceExpression.parse({
        terms: [
          { kind: TermKind.Flat, sign: Sign.Minus, value: 2, tags: {} },
          { kind: TermKind.Dice, sign: Sign.Plus, count: 1, size: 8, tags: {} },
        ],
      }),
    );
  });

  test('formats back to canonical notation', () => {
    expect(formatExpression(parsed(' d20 + 1d6 [Fire,persistent] - 2 '))).toBe(
      DiceExpressionText.parse('1d20+1d6[persistent,fire]-2'),
    );
  });

  test.each([
    ['', DiceMessage.Empty, 1],
    ['   ', DiceMessage.Empty, 1],
    ['1d20+x', DiceMessage.UnexpectedCharacter, 6],
    ['1d20+', DiceMessage.UnexpectedEnd, 6],
    ['1d', DiceMessage.UnexpectedEnd, 3],
    ['1d20 7', DiceMessage.UnexpectedToken, 6],
    ['++1', DiceMessage.UnexpectedToken, 2],
    ['0d6', DiceMessage.DiceCount, 1],
    ['101d6', DiceMessage.DiceCount, 1],
    ['1d1', DiceMessage.DieSize, 3],
    ['1d1001', DiceMessage.DieSize, 3],
    ['1+10000', DiceMessage.FlatValue, 3],
    ['2d6kh3', DiceMessage.KeepCount, 6],
    ['1d6[flame]', DiceMessage.UnknownTag, 5],
    ['1d6[fire, cold]', DiceMessage.ConflictingTag, 11],
    ['1d6[]', DiceMessage.UnknownTag, 5],
    ['1d6[fire', DiceMessage.UnexpectedCharacter, 4],
  ])('%p fails with %s at %d', (text, key, position) => {
    const { error, position: at } = failure(text);
    expect(error.key).toBe(key);
    expect(at).toBe(TextPosition.parse(position));
  });

  test('errors carry the params their message needs', () => {
    expect(failure('2d6kh3').error).toEqual({
      key: DiceMessage.KeepCount,
      params: { keep: 3, count: 2, position: 6 },
    });
    expect(failure('1d20+x').error).toEqual({
      key: DiceMessage.UnexpectedCharacter,
      params: { found: 'x', position: 6 },
    });
  });

  test('limits expression length and term count', () => {
    expect(failure('1'.repeat(201)).error.key).toBe(DiceMessage.TooLong);
    expect(failure(Array.from({ length: 21 }, () => '1').join('+')).error.key).toBe(DiceMessage.TooManyTerms);
    expect(parsed(Array.from({ length: 20 }, () => '1').join('+')).terms).toHaveLength(20);
  });
});
