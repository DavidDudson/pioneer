import {
  FormulaNumber,
  NodeKind,
  parseFormula,
  printFormula,
  ReferencePath,
  TextPosition,
} from '@pioneer/rules/formula';
import type { FormulaNode } from '@pioneer/rules/formula';
import { formulaFrom } from '@pioneer/rules/formula/testing';
import {
  array,
  constant,
  constantFrom,
  double,
  integer,
  letrec,
  oneof,
  record,
  stringMatching,
  tuple,
} from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { Attribute } from '../attribute';
import { knownReference } from '../formula-reference';

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
      // oxlint-disable-next-line unicorn/no-thenable -- Foundry spells the conditional { if, then } (ADR-0002); then is a statement, never a function
      record({ if: statement, then: statement }),
    ),
  };
}).statement;

/** A valid whole predicate, as plain JSON. */
export const predicateJson: Arbitrary<unknown> = array(predicateStatementJson, { maxLength: PREDICATE_LENGTH_MAX });

const AT = TextPosition.parse(1);
const SMALL_NUMBER_MAX = 20;

/** A selector as a reference writes it: colons become dots (`save.fortitude`). */
const selectorPath = keyPathText.map((text) => text.replaceAll(':', '.'));

/** Paths the reference vocabulary knows that read the character's values (ADR-0016). */
export const actorReferencePath: Arbitrary<string> = oneof(
  constant('level'),
  constantFrom(...Object.values(Attribute)).map((attribute) => `attr.${attribute}`),
  constant('attr.dex.capped'),
  selectorPath.map((path) => `prof.${path}`),
  selectorPath.map((path) => `rank.${path}`),
);

/** Paths the reference vocabulary knows that read the item a rule element is on. */
export const itemReferencePath: Arbitrary<string> = constant('item.level');

/** Paths the reference vocabulary knows, one family each (ADR-0016). */
export const knownReferencePath: Arbitrary<string> = oneof(actorReferencePath, itemReferencePath);

const PATH_SEGMENTS_MAX = 4;
const segment = stringMatching(/^[A-Za-z_][\w-]{0,8}$/u);

/** Any well-formed reference path the vocabulary does not know: typos, Foundry spellings, made-up paths. */
export const unknownReferencePath: Arbitrary<string> = oneof(
  array(segment, { minLength: 1, maxLength: PATH_SEGMENTS_MAX }).map((segments) => segments.join('.')),
  constantFrom('actor.level', 'actor.abilities.str.mod', 'attr.luck', 'attr.str.capped', 'prof', 'item.badge.value'),
).filter((path) => knownReference(ReferencePath.parse(path)) === undefined);

/** Canonical text of generated trees over `paths`, kept when it fits the parser's limits. */
function formulaTextOver(paths: Arbitrary<string>): Arbitrary<string> {
  const leaf: Arbitrary<FormulaNode> = oneof(
    integer({ min: 0, max: SMALL_NUMBER_MAX }).map((value): FormulaNode => ({
      kind: NodeKind.Number,
      value: FormulaNumber.parse(value),
      position: AT,
    })),
    paths.map((path): FormulaNode => ({
      kind: NodeKind.Reference,
      path: ReferencePath.parse(path),
      position: AT,
    })),
  );
  return formulaFrom(leaf)
    .map((tree) => printFormula(tree))
    .filter((text) => parseFormula(text).ok);
}

/** Formula text that parses and reads only known references, so a rule element accepts it. */
export const validFormulaText: Arbitrary<string> = formulaTextOver(knownReferencePath);

/** Formula text that parses and reads only the character's values, so a statistic's base formula accepts it. */
export const actorFormulaText: Arbitrary<string> = formulaTextOver(actorReferencePath);
