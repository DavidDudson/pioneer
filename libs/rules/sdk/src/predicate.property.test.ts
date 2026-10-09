import { describe, expect, test } from 'bun:test';

import { assert, constantFrom, integer, jsonValue, property, string } from 'fast-check';

import { Origin } from './origin';
import { Predicate, PREDICATE_DEPTH_MAX, PredicateStatement } from './predicate';
import { RollOption } from './roll-option';
import { Domain, Selector, SlotKey } from './selector';
import { SourceRef } from './source-ref';
import { keyPathText, predicateJson, predicateStatementJson, rollOptionText } from './testing';

const OPERATORS: ReadonlySet<string> = new Set([
  'and',
  'or',
  'xor',
  'nand',
  'nor',
  'iff',
  'not',
  'if',
  'then',
  'eq',
  'gt',
  'gte',
  'lt',
  'lte',
]);
const SCHEMAS = [Predicate, PredicateStatement, Selector, Domain, SlotKey, RollOption, SourceRef, Origin];

function nestedArrays(depth: number): unknown {
  let value: unknown = 'a:b';
  for (let level = 0; level < depth; level += 1) {
    value = [value];
  }
  return value;
}

describe('rules schemas (properties)', () => {
  test('generated key paths are valid selectors, domains and slot keys', () => {
    assert(
      property(keyPathText, (text) => {
        expect(Selector.safeParse(text).success).toBe(true);
        expect(Domain.safeParse(text).success).toBe(true);
        expect(SlotKey.safeParse(text).success).toBe(true);
      }),
    );
  });

  test('generated roll options are valid, and dropping the namespace makes them invalid', () => {
    assert(
      property(rollOptionText, (text) => {
        expect(RollOption.safeParse(text).success).toBe(true);
        expect(RollOption.safeParse(text.replaceAll(':', '-')).success).toBe(false);
      }),
    );
  });

  test('valid predicates parse to themselves (parse is the identity on valid JSON)', () => {
    assert(
      property(predicateJson, (json) => {
        const parsed: unknown = Predicate.parse(json);
        expect(parsed).toStrictEqual(json);
      }),
    );
  });

  test('an extra key on any object statement is rejected', () => {
    assert(
      property(
        predicateStatementJson.filter(
          (statement): statement is object => typeof statement === 'object' && statement !== null,
        ),
        string({ minLength: 1 }).filter((key) => !OPERATORS.has(key)),
        (statement, key) => {
          expect(PredicateStatement.safeParse({ ...statement, [key]: 'a:b' }).success).toBe(false);
        },
      ),
    );
  });

  test('arbitrary JSON never throws, whatever the schema', () => {
    assert(
      property(jsonValue(), constantFrom(...SCHEMAS), (json, schema) => {
        expect(() => schema.safeParse(json)).not.toThrow();
      }),
    );
  });

  test('any nesting depth is measured without throwing; past the limit it is rejected', () => {
    assert(
      property(integer({ min: 0, max: 5000 }), (depth) => {
        const result = Predicate.safeParse(nestedArrays(depth));
        if (depth >= PREDICATE_DEPTH_MAX) {
          expect(result.success).toBe(false);
        }
      }),
    );
  });
});
