import { array, constantFrom, integer, letrec, oneof, stringMatching } from 'fast-check';
import type { Arbitrary } from 'fast-check';

import { BinaryOperator, NodeKind, unhandledNode } from '../ast';
import type { FormulaNode } from '../ast';
import { ARITY, FormulaFunction } from '../functions';
import { FORMULA_NUMBER_MAX, FormulaNumber, ReferencePath, TextPosition } from '../units';

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

/** Formula trees up to a few levels deep, every node kind and function included. */
export const formula: Arbitrary<FormulaNode> = letrec<{ node: FormulaNode }>((tie) => ({
  node: oneof(
    { depthSize: 'small', maxDepth: MAX_DEPTH, withCrossShrink: true },
    number,
    reference,
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
