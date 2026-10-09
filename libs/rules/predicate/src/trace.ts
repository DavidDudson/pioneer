import type { Predicate, PredicateStatement } from '@pioneer/rules/sdk';

import { childStatements, combine, testOption } from './evaluate';
import type { PredicateFacts } from './facts';
import { all } from './truth';
import type { Truth } from './truth';

/** One statement with its verdict and the verdicts of the statements inside it. */
export interface StatementTrace {
  readonly statement: PredicateStatement;
  readonly truth: Truth;
  readonly children: readonly StatementTrace[];
}

/** A whole predicate's verdict with every statement's, for showing why it came out the way it did. */
export interface PredicateTrace {
  readonly truth: Truth;
  readonly statements: readonly StatementTrace[];
}

function traceStatement(statement: PredicateStatement, facts: PredicateFacts): StatementTrace {
  if (typeof statement === 'string') {
    return { statement, truth: testOption(statement, facts), children: [] };
  }
  const children = childStatements(statement).map((child) => traceStatement(child, facts));
  const truth = combine(
    statement,
    children.map((child) => child.truth),
    facts,
  );
  return { statement, truth, children };
}

/** `evaluatePredicate` with every statement's verdict kept. Slower; for explaining, not deriving. */
export function tracePredicate(predicate: Predicate, facts: PredicateFacts): PredicateTrace {
  const statements = predicate.map((statement) => traceStatement(statement, facts));
  return { truth: all(statements.map((statement) => statement.truth)), statements };
}
