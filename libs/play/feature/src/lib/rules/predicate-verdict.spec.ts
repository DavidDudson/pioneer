import { Negated, PredicateMessage, SummaryKind, Truth } from '@pioneer/rules/predicate';
import { CORE_NAMESPACES } from '@pioneer/rules/sdk/testing';
import { describe, expect, it } from 'vitest';

import { checkVerdict, EXAMPLE_FACTS, VerdictStatus } from './predicate-verdict';
import { rulesExample, RulesTool } from './rules-check';

describe(checkVerdict, () => {
  it('opens on an example that depends on the situation', () => {
    const check = checkVerdict(rulesExample(RulesTool.Verdict), EXAMPLE_FACTS, CORE_NAMESPACES);
    expect(check).toMatchObject({ status: VerdictStatus.Valid, truth: Truth.Unknown });
  });

  it('keeps every statement verdict, nested ones under their compound', () => {
    const check = checkVerdict(
      '["self:effect:rage", { "or": ["terrain:forest", "feat:power-attack"] }]',
      'self:effect:rage',
      CORE_NAMESPACES,
    );
    expect(check).toStrictEqual({
      status: VerdictStatus.Valid,
      truth: Truth.Unknown,
      statements: [
        { code: 'self:effect:rage', truth: Truth.True, children: [] },
        {
          code: 'or',
          truth: Truth.Unknown,
          children: [
            { code: 'terrain:forest', truth: Truth.Unknown, children: [] },
            { code: 'feat:power-attack', truth: Truth.False, children: [] },
          ],
        },
      ],
      summary: {
        kind: SummaryKind.Phrase,
        message: { key: PredicateMessage.Terrain, params: { name: 'forest', slug: 'forest', negated: Negated.No } },
      },
    });
  });

  it('shows comparisons as JSON and conditionals by their operators', () => {
    const check = checkVerdict(
      '[{ "gte": ["self:level", 5] }, { "if": "self:effect:rage", "then": "action:strike" }]',
      '',
      CORE_NAMESPACES,
    );
    expect(check).toMatchObject({
      status: VerdictStatus.Valid,
      truth: Truth.False,
      statements: [
        { code: '{"gte":["self:level",5]}', truth: Truth.False },
        { code: 'if/then', truth: Truth.True },
      ],
    });
  });

  it('skips blank lines and surrounding spaces in the roll options', () => {
    const check = checkVerdict('["terrain:forest"]', '\n  terrain:forest  \r\n\n', CORE_NAMESPACES);
    expect(check).toMatchObject({ status: VerdictStatus.Valid, truth: Truth.True });
  });

  it('names the lines that are not roll options', () => {
    expect(checkVerdict('[]', 'self:level:5\nFrightened\n\nnope', CORE_NAMESPACES)).toStrictEqual({
      status: VerdictStatus.InvalidFacts,
      lines: [2, 4],
    });
  });

  it('reports the predicate before the roll options', () => {
    expect(checkVerdict('[', 'Frightened', CORE_NAMESPACES)).toStrictEqual({ status: VerdictStatus.NotJson });
    expect(checkVerdict('["Frightened"]', 'Frightened', CORE_NAMESPACES)).toMatchObject({
      status: VerdictStatus.Invalid,
    });
  });
});
