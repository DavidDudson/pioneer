import { describe, expect, test } from 'bun:test';

import { FormulaMessage, FormulaText } from '@pioneer/rules/formula';
import { message } from '@pioneer/shared/kernel';

import { ReferenceScope } from './formula-reference';
import { formulaProblems, FormulaSource } from './formula-source';
import { RulesMessage } from './messages';

const ANY_SCOPE = new Set(Object.values(ReferenceScope));
const ACTOR_ONLY = new Set([ReferenceScope.Actor]);

const problems = (text: string, scopes = ANY_SCOPE): readonly unknown[] =>
  formulaProblems(FormulaText.parse(text), scopes).map((problem) => problem.error);

describe('formula problems', () => {
  test.each(['@level', '10 + @attr.dex.capped + @prof.ac', 'max(1, floor(@item.level / 2))', '3'])(
    '%s is fine',
    (text) => {
      expect(problems(text)).toStrictEqual([]);
    },
  );

  test('a parse error comes back alone, with its position', () => {
    expect(problems('1 + * @nope')).toStrictEqual([
      message(FormulaMessage.UnexpectedToken, { found: '*', position: 5 }),
    ]);
  });

  test('a parse error whose text has no position still carries one', () => {
    expect(problems('')).toStrictEqual([message(FormulaMessage.Empty, { position: 1 })]);
    expect(problems('1 +')).toStrictEqual([message(FormulaMessage.UnexpectedEnd, { position: 4 })]);
  });

  test('each unknown reference is a problem at its position', () => {
    expect(problems('@luck + @level + @attr.str.capped')).toStrictEqual([
      message(RulesMessage.UnknownReference, { found: '@luck', position: 1 }),
      message(RulesMessage.UnknownReference, { found: '@attr.str.capped', position: 18 }),
    ]);
  });

  test("Foundry's spelling names the path to write instead", () => {
    expect(problems('floor(@actor.abilities.str.mod / 2)')).toStrictEqual([
      message(RulesMessage.FoundryReference, {
        found: '@actor.abilities.str.mod',
        suggestion: '@attr.str',
        position: 7,
      }),
    ]);
  });

  test('an item reference is a problem where only the actor is in scope', () => {
    expect(problems('@level + @item.level', ACTOR_ONLY)).toStrictEqual([
      message(RulesMessage.ReferenceOutOfScope, { found: '@item.level', position: 10 }),
    ]);
  });

  test('FormulaSource reports each problem as its own issue', () => {
    const codes = FormulaSource.safeParse('@a + @b').error?.issues.map((issue) => issue.code);
    expect(codes).toStrictEqual(['custom', 'custom']);
  });
});
