import { array, constantFrom, double, letrec, oneof, record, stringMatching, tuple } from 'fast-check';
import type { Arbitrary } from 'fast-check';

/** One lowercase alphanumeric word. */
const word: Arbitrary<string> = stringMatching(/^[a-z\d]{1,6}$/u);
const SEPARATORS = ['-', ':'] as const;

const KEY_PATH_WORDS_MAX = 3;
const joinedWord = tuple(constantFrom(...SEPARATORS), word).map(([separator, next]) => separator + next);

/** Words joined by `-` or `:`: valid selectors, domains and slot keys. */
export const keyPathText: Arbitrary<string> = tuple(word, array(joinedWord, { maxLength: KEY_PATH_WORDS_MAX })).map(
  ([first, rest]) => first + rest.join(''),
);

/** A namespace, then a key path: valid roll options. */
export const rollOptionText: Arbitrary<string> = tuple(word, keyPathText).map(
  ([namespace, rest]) => `${namespace}:${rest}`,
);

const STATEMENT_LIST_MAX = 3;
const PREDICATE_LENGTH_MAX = 4;
/** Keeps generated predicates well under `PREDICATE_DEPTH_MAX`. */
const STATEMENT_DEPTH_MAX = 4;

const LIST_OPERATORS = ['and', 'or', 'xor', 'nand', 'nor', 'iff'] as const;
const COMPARISON_OPERATORS = ['eq', 'gt', 'gte', 'lt', 'lte'] as const;

const operand: Arbitrary<string | number> = oneof(rollOptionText, double({ noNaN: true, noDefaultInfinity: true }));

/**
 * Valid predicate statements in Foundry's JSON shape, as plain JSON (unparsed), covering every
 * operator. Use with `Predicate.parse` to get the typed value.
 */
export const predicateStatementJson: Arbitrary<unknown> = letrec<{ statement: unknown }>((tie) => {
  const statement = tie('statement');
  const list = array(statement, { minLength: 1, maxLength: STATEMENT_LIST_MAX });
  return {
    statement: oneof(
      { depthSize: 'small', maxDepth: STATEMENT_DEPTH_MAX, withCrossShrink: true },
      rollOptionText,
      tuple(constantFrom(...COMPARISON_OPERATORS), rollOptionText, operand).map(([operator, left, right]) => ({
        [operator]: [left, right],
      })),
      tuple(constantFrom(...LIST_OPERATORS), list).map(([operator, statements]) => ({ [operator]: statements })),
      record({ not: statement }),
      record({ if: statement, then: statement }),
    ),
  };
}).statement;

/** A valid whole predicate, as plain JSON. */
export const predicateJson: Arbitrary<unknown> = array(predicateStatementJson, { maxLength: PREDICATE_LENGTH_MAX });
