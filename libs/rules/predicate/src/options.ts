import { isPredicateComparison } from '@pioneer/rules/sdk';
import type {
  ComparisonOperands,
  Predicate,
  PredicateComparison,
  PredicateStatement,
  RollOption,
} from '@pioneer/rules/sdk';

import { childStatements } from './evaluate';

/**
 * The options a comparison reads: its left operand, and its right one when that is an option and the test reads
 * facts for it. `eq` against an option compares the two as plain text, so it reads none.
 */
function comparisonOptions(statement: PredicateComparison): readonly RollOption[] {
  if ('eq' in statement) {
    const [left, right] = statement.eq;
    return typeof right === 'string' ? [] : [left];
  }
  const [left, right] = orderOperands(statement);
  return typeof right === 'string' ? [left, right] : [left];
}

/** The operands of an order test (`gt`, `gte`, `lt`, `lte`). */
function orderOperands(
  statement: Exclude<PredicateComparison, { readonly eq: ComparisonOperands }>,
): ComparisonOperands {
  if ('gt' in statement) {
    return statement.gt;
  }
  if ('gte' in statement) {
    return statement.gte;
  }
  return 'lt' in statement ? statement.lt : statement.lte;
}

/** Adds the roll options `statement` reads to `found`: a bare option, a comparison's operands, then its children. */
function collect(statement: PredicateStatement, found: Set<RollOption>): void {
  if (typeof statement === 'string') {
    found.add(statement);
  } else if (isPredicateComparison(statement)) {
    for (const option of comparisonOptions(statement)) {
      found.add(option);
    }
  } else {
    for (const child of childStatements(statement)) {
      collect(child, found);
    }
  }
}

/**
 * Every roll option `predicate` reads, once: the options it names, and the operands of its comparisons that facts are
 * read for (`self:level` in `{ "gte": ["self:level", 5] }`). What a roll can toggle to change the predicate's verdict.
 */
export function predicateOptions(predicate: Predicate): ReadonlySet<RollOption> {
  const found = new Set<RollOption>();
  for (const statement of predicate) {
    collect(statement, found);
  }
  return found;
}
