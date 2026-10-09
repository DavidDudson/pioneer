import { RulesMessage } from '@pioneer/rules/sdk';
import { message, ValidationMessage } from '@pioneer/shared/kernel';
import { describe, expect, it } from 'vitest';

import { CheckStatus, checkRulesJson, formatPath, RulesSchema, rulesExample } from './rules-check';

describe(checkRulesJson, () => {
  it.each(Object.values(RulesSchema))('passes the %s example and returns it unchanged', (schema) => {
    const example = rulesExample(schema);
    expect(checkRulesJson(schema, example)).toStrictEqual({ status: CheckStatus.Valid, parsed: example });
  });

  it('returns the value as Pioneer encodes it, not as typed', () => {
    expect(checkRulesJson(RulesSchema.Predicate, '["a:b",{"not":"c:d"}]')).toStrictEqual({
      status: CheckStatus.Valid,
      parsed: '[\n  "a:b",\n  {\n    "not": "c:d"\n  }\n]',
    });
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

describe('checkRulesJson for rule elements', () => {
  it('names an unknown element key', () => {
    expect(checkRulesJson(RulesSchema.RuleElement, '{ "key": "Aura", "radius": 10 }')).toStrictEqual({
      status: CheckStatus.Invalid,
      issues: [{ path: ['key'], message: message(RulesMessage.UnknownElement, { key: 'Aura' }) }],
    });
  });

  it('points into a nested field', () => {
    const json = '{ "key": "FlatModifier", "selectors": ["AC"], "type": "item", "value": 1 }';
    expect(checkRulesJson(RulesSchema.RuleElement, json)).toStrictEqual({
      status: CheckStatus.Invalid,
      issues: [{ path: ['selectors', 0], message: message(RulesMessage.KeyFormat) }],
    });
  });

  it('accepts a proficiency raise', () => {
    const json = '{ "key": "Proficiency", "selector": "save:will", "rank": "expert" }';
    expect(checkRulesJson(RulesSchema.RuleElement, json).status).toBe(CheckStatus.Valid);
  });

  it('points into a martial proficiency', () => {
    const json = '{ "key": "MartialProficiency", "slug": "shields", "definition": ["item:trait:shield"], "value": 2 }';
    expect(checkRulesJson(RulesSchema.RuleElement, json)).toStrictEqual({
      status: CheckStatus.Invalid,
      issues: [{ path: ['value'], message: message(ValidationMessage.InvalidValue) }],
    });
  });

  it('points into a formula field at the mistake', () => {
    const json = '{ "key": "FlatModifier", "selectors": ["ac"], "type": "item", "value": "1 + @actor.level" }';
    expect(checkRulesJson(RulesSchema.RuleElement, json)).toStrictEqual({
      status: CheckStatus.Invalid,
      issues: [
        {
          path: ['value'],
          message: message(RulesMessage.FoundryReference, { found: '@actor.level', suggestion: '@level', position: 5 }),
          pointer: '1 + @actor.level\n    ^',
        },
      ],
    });
  });

  it('points into a statistic base formula that reads an item', () => {
    const json =
      '{ "slug": "sanity", "name": "Sanity", "selector": "sanity", "domains": [], "kind": "check", "base": "@item.level" }';
    expect(checkRulesJson(RulesSchema.Statistic, json)).toStrictEqual({
      status: CheckStatus.Invalid,
      issues: [
        {
          path: ['base'],
          message: message(RulesMessage.ReferenceOutOfScope, { found: '@item.level', position: 1 }),
          pointer: '@item.level\n^',
        },
      ],
    });
  });

  it('points at the end of a formula that ends too early', () => {
    const json = '{ "key": "Change", "selector": "ac", "mode": "add", "value": "max(1," }';
    expect(checkRulesJson(RulesSchema.RuleElement, json)).toMatchObject({
      issues: [{ path: ['value'], pointer: 'max(1,\n      ^' }],
    });
  });
});

describe(formatPath, () => {
  it.each([
    { path: [], expected: '' },
    { path: [0], expected: '[0]' },
    { path: ['sources', 0, 'aon'], expected: 'sources[0].aon' },
    { path: [0, 'or', 1, 'not'], expected: '[0].or[1].not' },
    { path: ['a.b'], expected: '["a.b"]' },
    { path: [0, ''], expected: '[0][""]' },
    { path: ['hops', 0, 'two words'], expected: 'hops[0]["two words"]' },
  ])('formats $path as "$expected"', ({ path, expected }) => {
    expect(formatPath(path)).toBe(expected);
  });
});
