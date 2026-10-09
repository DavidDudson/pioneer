import { array, constantFrom, dictionary, integer, letrec, oneof, record, stringMatching } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { BinaryOperator, NodeKind, unhandledNode } from '../ast';
import type { FormulaNode } from '../ast';
import { ARITY, FormulaFunction } from '../functions';
import { parseFormula } from '../parse';
import { printFormula } from '../print';
import { FORMULA_NUMBER_MAX, FormulaNumber, FormulaValue, ReferencePath, TextPosition } from '../units';
import type { Bindings } from './foundry';

/*
 * Arbitraries (fast-check) shared by the formula property tests. Generated nodes all sit at position 1:
 * positions come from text, so tests compare trees with `withoutPositions`.
 */

const AT = TextPosition.parse(1);
/** Extra arguments drawn for `min` and `max` beyond their minimum. */
const MAX_EXTRA_ARGS = 3;
const MAX_DEPTH = 6;

const number = integer({ min: 0, max: FORMULA_NUMBER_MAX }).map((value): FormulaNode => ({
  kind: NodeKind.Number,
  value: FormulaNumber.parse(value),
  position: AT,
}));
const segment = stringMatching(/^[A-Za-z_][\w-]{0,8}$/u);
const path = array(segment, { minLength: 1, maxLength: 4 }).map((segments) => ReferencePath.parse(segments.join('.')));
const reference = path.map((value): FormulaNode => ({ kind: NodeKind.Reference, path: value, position: AT }));
const operator = constantFrom(...Object.values(BinaryOperator));
const functionName = constantFrom(...Object.values(FormulaFunction));

/** Formula trees built from `leaves`, up to a few levels deep, every node kind and function included. */
export function formulaFrom(leaves: Arbitrary<FormulaNode>): Arbitrary<FormulaNode> {
  return letrec<{ node: FormulaNode }>((tie) => ({
    node: oneof(
      { depthSize: 'small', maxDepth: MAX_DEPTH, withCrossShrink: true },
      leaves,
      tie('node').map((operand): FormulaNode => ({ kind: NodeKind.Negate, operand, position: AT })),
      oneof(operator).chain((op) =>
        tie('node').chain((left) =>
          tie('node').map((right): FormulaNode => ({ kind: NodeKind.Binary, operator: op, left, right, position: AT })),
        ),
      ),
      functionName.chain((name) => {
        const { min, max } = ARITY[name];
        return array(tie('node'), { minLength: min, maxLength: max ?? min + MAX_EXTRA_ARGS }).map(
          (args): FormulaNode => ({ kind: NodeKind.Call, name, args, position: AT }),
        );
      }),
    ),
  })).node;
}

/** Formula trees over any number and any reference. */
export const formula: Arbitrary<FormulaNode> = formulaFrom(oneof(number, reference));

/** The references {@link evaluableFormula} draws from: few, so generated bindings cover them. */
export const BOUND_PATHS: readonly ReferencePath[] = ['level', 'actor.level', 'item.level', 'attr.dex.capped'].map(
  (text) => ReferencePath.parse(text),
);
const SMALL_NUMBER_MAX = 12;
const SMALL_VALUE_MAX = 20;
const smallNumber = integer({ min: 0, max: SMALL_NUMBER_MAX }).map((value): FormulaNode => ({
  kind: NodeKind.Number,
  value: FormulaNumber.parse(value),
  position: AT,
}));
const boundReference = constantFrom(...BOUND_PATHS).map((value): FormulaNode => ({
  kind: NodeKind.Reference,
  path: value,
  position: AT,
}));

/** Trees over small numbers and {@link BOUND_PATHS}, so most evaluate without leaving the safe range. */
export const evaluableFormula: Arbitrary<FormulaNode> = formulaFrom(oneof(smallNumber, boundReference));

const boundValue = integer({ min: -SMALL_VALUE_MAX, max: SMALL_VALUE_MAX }).map((value) => FormulaValue.parse(value));
const toBindings = (values: Partial<Record<ReferencePath, FormulaValue>>): Bindings =>
  new Map(Object.entries(values).map(([key, value]) => [ReferencePath.parse(key), FormulaValue.parse(value)]));

/** Values for some or all of {@link BOUND_PATHS}, small and of either sign. */
export const bindings: Arbitrary<Bindings> = dictionary(constantFrom(...BOUND_PATHS), boundValue).map((values) =>
  toBindings(values),
);

/** Values for every one of {@link BOUND_PATHS}. */
export const allBindings: Arbitrary<Bindings> = record(
  Object.fromEntries(BOUND_PATHS.map((bound) => [bound, boundValue])),
).map((values) => toBindings(values));

/** A tree's shape with every position dropped, for comparing parsed trees with generated ones. */
export function withoutPositions(node: FormulaNode): unknown {
  switch (node.kind) {
    case NodeKind.Negate: {
      return { kind: node.kind, operand: withoutPositions(node.operand) };
    }
    case NodeKind.Binary: {
      return {
        kind: node.kind,
        operator: node.operator,
        left: withoutPositions(node.left),
        right: withoutPositions(node.right),
      };
    }
    case NodeKind.Call: {
      return { kind: node.kind, name: node.name, args: node.args.map((arg) => withoutPositions(arg)) };
    }
    case NodeKind.Number: {
      return { kind: node.kind, value: node.value };
    }
    case NodeKind.Reference: {
      return { kind: node.kind, path: node.path };
    }
    default: {
      return unhandledNode(node);
    }
  }
}

/** Every node's position in a parsed tree. */
export function positions(node: FormulaNode, into = new Set<TextPosition>()): Set<TextPosition> {
  into.add(node.position);
  switch (node.kind) {
    case NodeKind.Number:
    case NodeKind.Reference: {
      return into;
    }
    case NodeKind.Negate: {
      return positions(node.operand, into);
    }
    case NodeKind.Binary: {
      positions(node.left, into);
      return positions(node.right, into);
    }
    case NodeKind.Call: {
      for (const arg of node.args) {
        positions(arg, into);
      }
      return into;
    }
    default: {
      return unhandledNode(node);
    }
  }
}

/** The tree as the parser gives it back from its printed text, so positions point into real text. */
export function reparsed(tree: FormulaNode): FormulaNode | undefined {
  const outcome = parseFormula(printFormula(tree));
  return outcome.ok ? outcome.formula : undefined;
}
