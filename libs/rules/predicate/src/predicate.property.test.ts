import { describe, expect, test } from 'bun:test';

import { isPredicateComparison, NamespaceKind, Predicate, PredicateStatement, RollOption } from '@pioneer/rules/sdk';
import type { ComparisonOperands, PredicateComparison, PredicateCompound } from '@pioneer/rules/sdk';
import { CORE_NAMESPACES, predicateJson, rollOptionText } from '@pioneer/rules/sdk/testing';
import type { Arbitrary } from 'fast-check';
import { array, assert, constantFrom, integer, letrec, oneof, property, record, subarray, tuple } from 'fast-check';

import { evaluatePredicate, evaluateStatement } from './evaluate';
import { PredicateFacts } from './facts';
import { namespaceTable } from './namespaces';
import type { NamespaceTable } from './namespaces';
import { Truth } from './truth';

/** A small vocabulary, so generated predicates and facts actually meet. */
const KNOWN_OPTIONS = ['self:effect:rage', 'feat:power-attack', 'class:fighter'] as const;
const SITUATIONAL_OPTIONS = ['terrain:forest', 'action:seek', 'target:trait:undead'] as const;
const KNOWN_PREFIX = 'self:level';
const SITUATIONAL_PREFIX = 'target:level';
const VALUE_MAX = 3;
const LIST_MAX = 3;
const DEPTH_MAX = 4;
const COMPARISONS = ['eq', 'gt', 'gte', 'lt', 'lte'] as const;
const LISTS = ['and', 'or', 'xor', 'nand', 'nor', 'iff'] as const;

const plainOption = constantFrom(...KNOWN_OPTIONS, ...SITUATIONAL_OPTIONS);
const prefix = constantFrom(KNOWN_PREFIX, SITUATIONAL_PREFIX);
const smallNumber = integer({ min: 0, max: VALUE_MAX });

const statementJson: Arbitrary<unknown> = letrec<{ statement: unknown }>((tie) => {
  const statement = tie('statement');
  const list = array(statement, { minLength: 1, maxLength: LIST_MAX });
  return {
    statement: oneof(
      { depthSize: 'small', maxDepth: DEPTH_MAX, withCrossShrink: true },
      plainOption,
      tuple(constantFrom(...COMPARISONS), prefix, oneof(smallNumber, prefix)).map(([operator, left, right]) => ({
        [operator]: [left, right],
      })),
      tuple(constantFrom(...LISTS), list).map(([operator, statements]) => ({ [operator]: statements })),
      record({ not: statement }),
      // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002)
      record({ if: statement, then: statement }),
    ),
  };
}).statement;

const statement: Arbitrary<PredicateStatement> = statementJson.map((json) => PredicateStatement.parse(json));
const predicate: Arbitrary<Predicate> = array(statementJson, { maxLength: LIST_MAX }).map((json) =>
  Predicate.parse(json),
);

const numericOptions = (name: string): Arbitrary<readonly string[]> =>
  subarray([0, 1, 2, VALUE_MAX]).map((values) => values.map((each) => `${name}:${each}`));

/** Present options drawn from the vocabulary, numeric ones included. */
const options: Arbitrary<readonly string[]> = tuple(
  subarray([...KNOWN_OPTIONS, ...SITUATIONAL_OPTIONS]),
  numericOptions(KNOWN_PREFIX),
  numericOptions(SITUATIONAL_PREFIX),
).map((parts) => parts.flat());

function toFacts(present: readonly string[], table: NamespaceTable): PredicateFacts {
  return new PredicateFacts(
    present.map((option) => RollOption.parse(option)),
    table,
  );
}

const defaultFacts = (present: readonly string[]): PredicateFacts => toFacts(present, CORE_NAMESPACES);

/** Every vocabulary namespace known: the two-valued world Foundry evaluates in. */
const ALL_KNOWN = namespaceTable({
  self: NamespaceKind.Known,
  feat: NamespaceKind.Known,
  class: NamespaceKind.Known,
  terrain: NamespaceKind.Known,
  action: NamespaceKind.Known,
  target: NamespaceKind.Known,
});

/*
 * Foundry pf2e's `Predicate#test`, transcribed from `src/module/system/predication.ts` as the two-valued
 * reference. Split into helpers only to stay inside the lint limits.
 */

type FoundryOrder = (left: number, right: number) => boolean;

/** Foundry's `getValues`: a number as itself, an option as every number written after it, else `[NaN]`. */
function foundryValues(operand: string | number, domain: ReadonlySet<string>): readonly number[] {
  const asNumber = Number(operand);
  if (!Number.isNaN(asNumber)) {
    return [asNumber];
  }
  const head = `${operand}:`;
  const found = [...domain]
    .filter((option) => option.startsWith(head) && !option.slice(head.length).includes(':'))
    .map((option) => Number(option.slice(head.length)))
    .filter((each) => !Number.isNaN(each));
  return found.length > 0 ? found : [Number.NaN];
}

function foundryOrder(order: FoundryOrder, [left, right]: ComparisonOperands, domain: ReadonlySet<string>): boolean {
  const rightValues = foundryValues(right, domain);
  return foundryValues(left, domain).some((value) => rightValues.every((bound) => order(value, bound)));
}

function foundryComparison(item: PredicateComparison, domain: ReadonlySet<string>): boolean {
  if ('eq' in item) {
    const [left, right] = item.eq;
    return typeof right === 'string' ? left === right : domain.has(`${left}:${right}`);
  }
  if ('gt' in item) {
    return foundryOrder((left, right) => left > right, item.gt, domain);
  }
  if ('gte' in item) {
    return foundryOrder((left, right) => left >= right, item.gte, domain);
  }
  if ('lt' in item) {
    return foundryOrder((left, right) => left < right, item.lt, domain);
  }
  return foundryOrder((left, right) => left <= right, item.lte, domain);
}

function foundryCompound(item: PredicateCompound, domain: ReadonlySet<string>): boolean {
  const holds = (inner: PredicateStatement): boolean => foundryStatement(inner, domain);
  if ('and' in item) {
    return item.and.every(holds);
  }
  if ('nand' in item) {
    return !item.nand.every(holds);
  }
  if ('or' in item) {
    return item.or.some(holds);
  }
  if ('xor' in item) {
    return item.xor.filter(holds).length === 1;
  }
  if ('nor' in item) {
    return !item.nor.some(holds);
  }
  if ('not' in item) {
    return !holds(item.not);
  }
  if ('iff' in item) {
    return item.iff.every(holds) || item.iff.every((inner) => !holds(inner));
  }
  return !(holds(item.if) && !holds(item.then));
}

function foundryStatement(item: PredicateStatement, domain: ReadonlySet<string>): boolean {
  if (typeof item === 'string') {
    return domain.has(item);
  }
  return isPredicateComparison(item) ? foundryComparison(item, domain) : foundryCompound(item, domain);
}

describe('evaluatePredicate (properties)', () => {
  test('with every namespace known, it agrees with Foundry and is never unknown', () => {
    assert(
      property(predicate, options, (given, present) => {
        const expected = given.every((item) => foundryStatement(item, new Set(present)));
        expect(evaluatePredicate(given, toFacts(present, ALL_KNOWN))).toBe(expected ? Truth.True : Truth.False);
      }),
    );
  });

  test('and, or, xor and iff are commutative', () => {
    assert(
      property(statement, statement, options, (left, right, present) => {
        const given = defaultFacts(present);
        for (const operator of ['and', 'or', 'xor', 'iff'] as const) {
          const forward = evaluateStatement(PredicateStatement.parse({ [operator]: [left, right] }), given);
          const backward = evaluateStatement(PredicateStatement.parse({ [operator]: [right, left] }), given);
          expect(forward).toBe(backward);
        }
      }),
    );
  });

  test('and and or are associative', () => {
    assert(
      property(tuple(statement, statement, statement), options, ([first, second, third], present) => {
        const given = defaultFacts(present);
        for (const operator of ['and', 'or'] as const) {
          const leftFirst = PredicateStatement.parse({ [operator]: [{ [operator]: [first, second] }, third] });
          const rightFirst = PredicateStatement.parse({ [operator]: [first, { [operator]: [second, third] }] });
          expect(evaluateStatement(leftFirst, given)).toBe(evaluateStatement(rightFirst, given));
        }
      }),
    );
  });

  test("De Morgan's laws hold, and double negation is the identity", () => {
    assert(
      property(statement, statement, options, (left, right, present) => {
        const given = defaultFacts(present);
        const evaluate = (json: unknown): Truth => evaluateStatement(PredicateStatement.parse(json), given);
        expect(evaluate({ not: { and: [left, right] } })).toBe(evaluate({ or: [{ not: left }, { not: right }] }));
        expect(evaluate({ not: { or: [left, right] } })).toBe(evaluate({ and: [{ not: left }, { not: right }] }));
        expect(evaluate({ nand: [left, right] })).toBe(evaluate({ not: { and: [left, right] } }));
        expect(evaluate({ nor: [left, right] })).toBe(evaluate({ not: { or: [left, right] } }));
        expect(evaluate({ not: { not: left } })).toBe(evaluateStatement(left, given));
      }),
    );
  });

  test('unknown breaks excluded middle and non-contradiction; definite verdicts keep them', () => {
    assert(
      property(statement, options, (item, present) => {
        const given = defaultFacts(present);
        const either = evaluateStatement(PredicateStatement.parse({ or: [item, { not: item }] }), given);
        const both = evaluateStatement(PredicateStatement.parse({ and: [item, { not: item }] }), given);
        const unknown = evaluateStatement(item, given) === Truth.Unknown;
        expect([either, both]).toEqual(unknown ? [Truth.Unknown, Truth.Unknown] : [Truth.True, Truth.False]);
      }),
    );
  });

  test('with the default table, every definite verdict agrees with Foundry', () => {
    assert(
      property(predicate, options, (given, present) => {
        const verdict = evaluatePredicate(given, defaultFacts(present));
        const expected = given.every((item) => foundryStatement(item, new Set(present))) ? Truth.True : Truth.False;
        expect(verdict === Truth.Unknown || verdict === expected).toBe(true);
      }),
    );
  });

  /**
   * An option with a value is settled (rules-engine.md, ADR-0002): a second value of the same option could flip a
   * comparison, so only options not given yet are added.
   */
  test('supplying situational facts not given yet never changes a true or false verdict', () => {
    assert(
      property(predicate, options, options, (given, before, extra) => {
        const settled = new Set(before.map((option) => option.slice(0, option.lastIndexOf(':'))));
        const added = extra.filter(
          (option) =>
            (SITUATIONAL_OPTIONS as readonly string[]).includes(option) ||
            (option.startsWith(`${SITUATIONAL_PREFIX}:`) && !settled.has(SITUATIONAL_PREFIX)),
        );
        const earlier = evaluatePredicate(given, defaultFacts(before));
        const later = evaluatePredicate(given, defaultFacts([...before, ...added]));
        if (earlier !== Truth.Unknown) {
          expect(later).toBe(earlier);
        }
      }),
    );
  });

  test('any valid predicate against any options gives a verdict without throwing', () => {
    assert(
      property(predicateJson, array(rollOptionText, { maxLength: 8 }), (json, present) => {
        const verdict = evaluatePredicate(Predicate.parse(json), defaultFacts(present));
        expect(Object.values(Truth)).toContain(verdict);
      }),
    );
  });
});
