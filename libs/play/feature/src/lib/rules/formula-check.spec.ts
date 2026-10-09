import { FormulaMessage, TextPosition } from '@pioneer/rules/formula';
import { describe, expect, it } from 'vitest';

import { checkFormula, pointAt } from './formula-check';
import { CheckStatus, rulesExample, RulesTool } from './rules-check';

describe(checkFormula, () => {
  it('passes the example and prints it back unchanged', () => {
    const example = rulesExample(RulesTool.Formula);
    expect(checkFormula(example)).toMatchObject({ status: CheckStatus.Valid, canonical: example });
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
    expect(checkFormula('max(1,@level)')).toStrictEqual({
      status: CheckStatus.Valid,
      canonical: 'max(1, @level)',
      tree: JSON.stringify(tree, undefined, 2),
    });
  });

  it('reports the error as a message descriptor and points at it', () => {
    expect(checkFormula('1 + level')).toStrictEqual({
      status: CheckStatus.Invalid,
      error: { key: FormulaMessage.UnknownFunction, params: { found: 'level', position: 5 } },
      position: 5,
      pointer: '1 + level\n    ^',
    });
  });

  it('points just past the end when the formula stops early', () => {
    expect(checkFormula('2 *')).toMatchObject({ status: CheckStatus.Invalid, pointer: '2 *\n   ^' });
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
