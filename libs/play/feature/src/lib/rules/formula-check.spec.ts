import { FormulaMessage, ReferencePath, TextPosition } from '@pioneer/rules/formula';
import { describe, expect, it } from 'vitest';

import { checkFormula, pointAt } from './formula-check';
import type { ReferenceEntries } from './formula-check';
import { CheckStatus, rulesExample, RulesTool } from './rules-check';

const NONE: ReferenceEntries = new Map();
const LEVEL = ReferencePath.parse('level');
const typed = (value: number, complete = true): ReferenceEntries => new Map([[LEVEL, { value, complete }]]);

describe(checkFormula, () => {
  it('passes the example, prints it back unchanged and evaluates it with the starting values', () => {
    const example = rulesExample(RulesTool.Formula);
    expect(checkFormula(example, NONE)).toMatchObject({
      status: CheckStatus.Valid,
      canonical: example,
      references: ['attr.dex.capped', 'prof.armor', 'level'],
      evaluation: { status: CheckStatus.Valid, value: 20 },
    });
  });

  it('prints the canonical form and the tree with positions', () => {
    const tree = {
      kind: 'call',
      name: 'max',
      args: [
        { kind: 'number', value: 1, position: 5 },
        { kind: 'reference', path: 'level', position: 7 },
      ],
      position: 1,
    };
    expect(checkFormula('max(1,@level)', NONE)).toStrictEqual({
      status: CheckStatus.Valid,
      canonical: 'max(1, @level)',
      tree: JSON.stringify(tree, undefined, 2),
      references: ['level'],
      evaluation: { status: CheckStatus.Valid, value: 5 },
    });
  });

  it('lists each reference once, in the order first written', () => {
    expect(checkFormula('@b + @a + @b', NONE)).toMatchObject({ references: ['b', 'a'] });
  });

  it('evaluates with the values typed, rounding down', () => {
    expect(checkFormula('@level / 2', typed(7))).toMatchObject({ evaluation: { value: 3 } });
  });

  it('leaves a reference unknown while its box is empty or out of range, and points at it', () => {
    const unknown = {
      status: CheckStatus.Invalid,
      error: { key: FormulaMessage.UnknownReference, params: { found: '@level', position: 5 } },
      position: 5,
      pointer: '1 + @level\n    ^',
    };
    expect(checkFormula('1 + @level', typed(3, false))).toMatchObject({ evaluation: unknown });
    expect(checkFormula('1 + @level', typed(1_000_000))).toMatchObject({ evaluation: unknown });
  });

  it('points at a division by zero', () => {
    expect(checkFormula('10 / (@level - 5)', NONE)).toMatchObject({
      evaluation: { error: { key: FormulaMessage.DivisionByZero }, pointer: '10 / (@level - 5)\n   ^' },
    });
  });

  it('reports the error as a message descriptor and points at it', () => {
    expect(checkFormula('1 + level', NONE)).toStrictEqual({
      status: CheckStatus.Invalid,
      error: { key: FormulaMessage.UnknownFunction, params: { found: 'level', position: 5 } },
      position: 5,
      pointer: '1 + level\n    ^',
    });
  });

  it('points just past the end when the formula stops early', () => {
    expect(checkFormula('2 *', NONE)).toMatchObject({ status: CheckStatus.Invalid, pointer: '2 *\n   ^' });
  });
});

describe(pointAt, () => {
  it('keeps tabs so the caret lines up', () => {
    expect(pointAt('\t1 # 2', TextPosition.parse(4))).toBe('\t1 # 2\n\t  ^');
  });

  it('puts the caret line under the line holding the position', () => {
    expect(pointAt('1\n+ #\n2', TextPosition.parse(5))).toBe('1\n+ #\n  ^\n2');
  });
});
