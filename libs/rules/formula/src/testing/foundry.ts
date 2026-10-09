import { NodeKind, unhandledNode } from '../ast';
import type { FormulaNode } from '../ast';
import { FormulaValue } from '../units';
import type { ReferencePath } from '../units';

/*
 * A model of how Foundry evaluates a rule element's formula, the reference the evaluator is checked against.
 * pf2e's `RuleElementPF2e#resolveValue` substitutes the reference values into the text and hands it to
 * `Roll.safeEval`, which runs it as JavaScript with `Math` (plus pf2e's helpers) in scope and does not round.
 */

/** Values for references, by path. */
export type Bindings = ReadonlyMap<ReferencePath, FormulaValue>;

/**
 * The `Math` functions formulas call, with the helpers pf2e adds to it (`src/scripts/hooks/load.ts`) as
 * written there: comparisons give booleans, and `ternary` takes both branches already evaluated.
 */
const PF2E_MATH = {
  min: Math.min,
  max: Math.max,
  floor: Math.floor,
  ceil: Math.ceil,
  abs: Math.abs,
  round: Math.round,
  sign: Math.sign,
  eq: (left: number, right: number): boolean => left === right,
  ne: (left: number, right: number): boolean => left !== right,
  gt: (left: number, right: number): boolean => left > right,
  gte: (left: number, right: number): boolean => left >= right,
  lt: (left: number, right: number): boolean => left < right,
  lte: (left: number, right: number): boolean => left <= right,
  ternary: (condition: unknown, ifTrue: unknown, ifFalse: unknown): unknown => {
    const holds = Boolean(condition);
    return holds ? ifTrue : ifFalse;
  },
} as const;

/** The tree as JavaScript, every reference replaced by its value as `Roll.replaceFormulaData` does. */
function javascript(node: FormulaNode, values: Bindings): string {
  switch (node.kind) {
    case NodeKind.Number: {
      return String(node.value);
    }
    case NodeKind.Reference: {
      // Bracketed so a negative value after a minus reads as `- (-2)`, not as the `--` operator.
      return `(${String(values.get(node.path))})`;
    }
    case NodeKind.Negate: {
      return `(-${javascript(node.operand, values)})`;
    }
    case NodeKind.Binary: {
      return `(${javascript(node.left, values)} ${node.operator} ${javascript(node.right, values)})`;
    }
    case NodeKind.Call: {
      return `Math.${node.name}(${node.args.map((arg) => javascript(arg, values)).join(', ')})`;
    }
    default: {
      return unhandledNode(node);
    }
  }
}

/**
 * What Foundry makes of the formula with every reference bound, rounded down to a whole number. Throws when
 * the JavaScript result is not a whole number in the safe range once rounded (`Infinity`, `NaN`).
 */
export function foundryValue(node: FormulaNode, values: Bindings): FormulaValue {
  // oxlint-disable-next-line typescript/no-implied-eval, no-new-func -- this models Foundry's own eval of the text; test only, and the text is printed from a tree
  const run = new Function('Math', `"use strict"; return (${javascript(node, values)});`);
  const result: unknown = Reflect.apply(run, undefined, [PF2E_MATH]);
  const floored = Math.floor(Number(result));
  return FormulaValue.parse(floored === 0 ? 0 : floored);
}
