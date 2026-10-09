import type {
  ComparisonOperands,
  Predicate,
  PredicateComparison,
  PredicateCompound,
  PredicateStatement,
  RollOption,
} from '@pioneer/rules/sdk';

import { OptionValue } from './facts';
import type { PredicateFacts } from './facts';
import { all, allSame, any, exactlyOne, implies, not, Truth, truthOf } from './truth';

/** The compounds that hold a list of statements: everything but `not` and `if`/`then`. */
type ListCompound = Exclude<
  PredicateCompound,
  { readonly not: PredicateStatement } | { readonly if: PredicateStatement; readonly then: PredicateStatement }
>;

type Order = (left: OptionValue, right: OptionValue) => boolean;

const greater: Order = (left, right) => left > right;
const greaterOrEqual: Order = (left, right) => left >= right;
const less: Order = (left, right) => left < right;
const lessOrEqual: Order = (left, right) => left <= right;

function isComparison(statement: Exclude<PredicateStatement, RollOption>): statement is PredicateComparison {
  return 'eq' in statement || 'gt' in statement || 'gte' in statement || 'lt' in statement || 'lte' in statement;
}

/** A plain option: present is true; missing is false in a known namespace and unknown in a situational one. */
export function testOption(option: RollOption, facts: PredicateFacts): Truth {
  if (facts.has(option)) {
    return Truth.True;
  }
  return facts.isKnown(option) ? Truth.False : Truth.Unknown;
}

/**
 * `{ "eq": [a, b] }`. Foundry compares two options as plain text, and an option with a number by looking for
 * `a:b`. Missing `a:b` is false once `a` is known or has any value, and unknown before that.
 */
function testEquals([left, right]: ComparisonOperands, facts: PredicateFacts): Truth {
  if (typeof right === 'string') {
    return truthOf(left === right);
  }
  if (facts.has(`${left}:${right}`)) {
    return Truth.True;
  }
  return facts.isKnown(left) || facts.values(left).length > 0 ? Truth.False : Truth.Unknown;
}

/**
 * `{ "gt": [a, b] }` and friends, as Foundry does them: some value of `a` beats every value of `b`. An
 * option with no value makes the test false if its namespace is known, and unknown if it is situational.
 */
function testOrder(order: Order, [left, right]: ComparisonOperands, facts: PredicateFacts): Truth {
  const leftValues = facts.values(left);
  const rightValues = typeof right === 'string' ? facts.values(right) : [OptionValue.parse(right)];
  const missing: readonly RollOption[] = [
    ...(leftValues.length === 0 ? [left] : []),
    ...(typeof right === 'string' && rightValues.length === 0 ? [right] : []),
  ];
  if (missing.some((option) => facts.isKnown(option))) {
    return Truth.False;
  }
  if (missing.length > 0) {
    return Truth.Unknown;
  }
  return truthOf(leftValues.some((value) => rightValues.every((bound) => order(value, bound))));
}

function testComparison(statement: PredicateComparison, facts: PredicateFacts): Truth {
  if ('eq' in statement) {
    return testEquals(statement.eq, facts);
  }
  if ('gt' in statement) {
    return testOrder(greater, statement.gt, facts);
  }
  if ('gte' in statement) {
    return testOrder(greaterOrEqual, statement.gte, facts);
  }
  if ('lt' in statement) {
    return testOrder(less, statement.lt, facts);
  }
  return testOrder(lessOrEqual, statement.lte, facts);
}

function combineList(statement: ListCompound, children: readonly Truth[]): Truth {
  if ('and' in statement) {
    return all(children);
  }
  if ('or' in statement) {
    return any(children);
  }
  if ('xor' in statement) {
    return exactlyOne(children);
  }
  if ('nand' in statement) {
    return not(all(children));
  }
  if ('nor' in statement) {
    return not(any(children));
  }
  return allSame(children);
}

/**
 * One statement's verdict from its children's verdicts (in `childStatements` order). Shared by
 * `evaluateStatement` and `tracePredicate`, which differ only in whether they keep the children.
 */
export function combine(
  statement: Exclude<PredicateStatement, RollOption>,
  children: readonly Truth[],
  facts: PredicateFacts,
): Truth {
  if (isComparison(statement)) {
    return testComparison(statement, facts);
  }
  if ('not' in statement) {
    return not(all(children));
  }
  if ('if' in statement) {
    const [condition = Truth.Unknown, consequence = Truth.Unknown] = children;
    return implies(condition, consequence);
  }
  return combineList(statement, children);
}

function listStatements(statement: ListCompound): readonly PredicateStatement[] {
  if ('and' in statement) {
    return statement.and;
  }
  if ('or' in statement) {
    return statement.or;
  }
  if ('xor' in statement) {
    return statement.xor;
  }
  if ('nand' in statement) {
    return statement.nand;
  }
  if ('nor' in statement) {
    return statement.nor;
  }
  return statement.iff;
}

/** The statements directly inside `statement`, in order: `[if, then]` for a conditional. */
export function childStatements(statement: PredicateStatement): readonly PredicateStatement[] {
  if (typeof statement === 'string' || isComparison(statement)) {
    return [];
  }
  if ('not' in statement) {
    return [statement.not];
  }
  if ('if' in statement) {
    return [statement.if, statement.then];
  }
  return listStatements(statement);
}

/** One statement's verdict. Pure and total; nesting is bounded by the schema's depth limit. */
export function evaluateStatement(statement: PredicateStatement, facts: PredicateFacts): Truth {
  if (typeof statement === 'string') {
    return testOption(statement, facts);
  }
  const children = childStatements(statement).map((child) => evaluateStatement(child, facts));
  return combine(statement, children, facts);
}

/**
 * Whether `predicate` holds, with Kleene logic: `true`, `false`, or `unknown` when it depends on situational
 * facts nobody supplied. Every statement must hold; an empty predicate is `true`. Two-valued answers match
 * Foundry pf2e's `Predicate.test`.
 */
export function evaluatePredicate(predicate: Predicate, facts: PredicateFacts): Truth {
  return all(predicate.map((statement) => evaluateStatement(statement, facts)));
}
