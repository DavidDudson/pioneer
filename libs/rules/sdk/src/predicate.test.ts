import { describe, expect, test } from 'bun:test';

import { fieldIssues, message, ValidationMessage } from '@pioneer/shared/kernel';
import type { FieldIssue } from '@pioneer/shared/kernel';
import { z } from 'zod';

import { RulesMessage } from './messages';
import { Predicate, PREDICATE_DEPTH_MAX, PredicateStatement } from './predicate';
import { RollOption } from './roll-option';
import { Domain, Selector } from './selector';

function issues(schema: z.ZodType, value: unknown): readonly FieldIssue[] {
  const result = schema.safeParse(value);
  return result.success ? [] : fieldIssues(result.error.issues);
}

function notChain(depth: number): unknown {
  let statement: unknown = 'self:condition:frightened';
  for (let level = 0; level < depth; level += 1) {
    statement = { not: statement };
  }
  return statement;
}

function nestedNot(depth: number): unknown {
  return [notChain(depth)];
}

const keyFormat = message(RulesMessage.KeyFormat);
const rollOptionFormat = message(RulesMessage.RollOptionFormat);

describe('Selector and Domain', () => {
  test.each(['ac', 'perception', 'save:fortitude', 'skill:athletics', 'speed:land', 'skill-check', 'class-dc'])(
    'accepts %s',
    (value) => {
      expect(Selector.safeParse(value).success).toBe(true);
      expect(Domain.safeParse(value).success).toBe(true);
    },
  );

  test.each(['', 'AC', 'save::fortitude', ':ac', 'ac:', 'ac-', 'skill athletics', 'dex_based'])(
    'rejects %p with a localised format message',
    (value) => {
      expect(issues(Selector, value)).toStrictEqual([{ path: [], message: keyFormat }]);
    },
  );
});

describe('RollOption', () => {
  test.each(['self:condition:frightened', 'item:trait:agile', 'terrain:forest', 'self:level:5'])(
    'accepts %s',
    (value) => {
      expect(RollOption.safeParse(value).success).toBe(true);
    },
  );

  test.each(['frightened', 'Self:condition', 'self::x', 'self:', 'self:condition:frightened:'])(
    'rejects %p: it needs a namespace and words',
    (value) => {
      expect(issues(RollOption, value)).toStrictEqual([{ path: [], message: rollOptionFormat }]);
    },
  );
});

describe('Predicate', () => {
  test('accepts every Foundry statement form', () => {
    const foundry = [
      'self:condition:frightened',
      { not: 'item:trait:agile' },
      { or: ['action:seek', 'terrain:forest'] },
      { and: ['self:effect:rage', { nor: ['item:trait:ranged', 'item:category:unarmed'] }] },
      { xor: ['a:b', 'c:d'] },
      { nand: ['a:b', 'c:d'] },
      { iff: ['a:b', 'c:d'] },
      // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002); then is a statement, never a function
      { if: 'target:trait:undead', then: 'item:damage:type:vitality' },
      { gte: ['self:level', 5] },
      { lt: ['target:level', 'self:level'] },
      { eq: ['self:condition:frightened', 2] },
    ];
    const parsed: unknown = Predicate.parse(foundry);
    expect(parsed).toStrictEqual(foundry);
  });

  test('encodes back to the same JSON (the depth guard is not a one-way transform)', () => {
    const json = ['a:b', { not: 'c:d' }, { gte: ['self:level', 5] }];
    const encoded: unknown = z.encode(Predicate, Predicate.parse(json));
    expect(encoded).toStrictEqual(json);
  });

  test('an empty predicate always holds, so it is valid', () => {
    expect(Predicate.parse([])).toStrictEqual([]);
  });

  test('points at the statement no form matches', () => {
    expect(issues(Predicate, ['a:b', { xand: ['a:b'] }])).toStrictEqual([
      { path: [1], message: message(ValidationMessage.NoMatch) },
    ]);
  });

  test('points at an unknown key beside a known operator', () => {
    expect(issues(Predicate, [{ and: ['a:b'], label: 'x' }])).toStrictEqual([
      { path: [0, 'label'], message: message(ValidationMessage.UnrecognizedKeys, { count: 1, keys: 'label' }) },
    ]);
  });

  test('points into nested statements', () => {
    expect(issues(Predicate, [{ or: ['a:b', { not: 'Bad' }] }])).toStrictEqual([
      { path: [0, 'or', 1, 'not'], message: rollOptionFormat },
    ]);
  });

  test('a lone statement is not a predicate: predicates are arrays', () => {
    expect(issues(Predicate, 'a:b')).toStrictEqual([
      { path: [], message: message(ValidationMessage.InvalidType, { expected: 'array' }) },
    ]);
  });

  test('rejects nesting past the limit before walking it', () => {
    // Each `not` adds one object; the predicate array is one more level.
    expect(Predicate.safeParse(nestedNot(PREDICATE_DEPTH_MAX - 1)).success).toBe(true);
    expect(issues(Predicate, nestedNot(PREDICATE_DEPTH_MAX))).toStrictEqual([
      { path: [], message: message(RulesMessage.PredicateTooDeep, { maximum: PREDICATE_DEPTH_MAX }) },
    ]);
  });

  test('very deep input is rejected, not a stack overflow', () => {
    const deep = nestedNot(100_000);
    expect(Predicate.safeParse(deep).success).toBe(false);
  });

  test('a lone statement has the same depth guard as a whole predicate', () => {
    expect(issues(PredicateStatement, notChain(100_000))).toStrictEqual([
      { path: [], message: message(RulesMessage.PredicateTooDeep, { maximum: PREDICATE_DEPTH_MAX }) },
    ]);
  });
});
