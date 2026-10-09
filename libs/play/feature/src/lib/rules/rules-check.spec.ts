import { RulesMessage } from '@pioneer/rules/sdk';
import { message, ValidationMessage } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { CheckStatus, checkRulesJson, formatPath, RulesSchema, rulesExample } from './rules-check';

describe(checkRulesJson, () => {
  it.each(Object.values(RulesSchema))('passes the %s example', (schema) => {
    expect(checkRulesJson(schema, rulesExample(schema))).toStrictEqual({ status: CheckStatus.Valid });
  });

  it('says when the text is not JSON at all', () => {
    expect(checkRulesJson(RulesSchema.Predicate, '[self:condition:frightened]')).toStrictEqual({
      status: CheckStatus.NotJson,
    });
  });

  it('lists each problem with its path and a message descriptor', () => {
    const outcome = checkRulesJson(RulesSchema.Predicate, '["Frightened", { "and": ["a:b"], "label": "x" }]');
    expect(outcome).toStrictEqual({
      status: CheckStatus.Invalid,
      issues: [
        { path: [0], message: message(RulesMessage.RollOptionFormat) },
        { path: [1, 'label'], message: message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: 'label' }) },
      ],
    });
  });
});

describe(formatPath, () => {
  it.each([
    { path: [], expected: '' },
    { path: [0], expected: '[0]' },
    { path: ['sources', 0, 'aon'], expected: 'sources[0].aon' },
    { path: [0, 'or', 1, 'not'], expected: '[0].or[1].not' },
  ])('formats $path as "$expected"', ({ path, expected }) => {
    expect(formatPath(path)).toBe(expected);
  });
});
