import { NodeKind, unhandledNode } from '../ast';
import type { FormulaNode } from '../ast';
import { FormulaValue } from '../units';
import type { ReferencePath } from '../units';

/*
 * A model of how Foundry evaluates a rule element's formula, the reference the evaluator is checked against.
 * pf2e's `RuleElementPF2e#resolveValue` substitutes the reference values into the text and hands it to
 * `Roll.safeEval`, which runs it as JavaScript with `Math` (plus pf2e's helpers) in scope and does not round.
 * pf2e only evaluates text with a reference in it (other text stays a string, which `FlatModifier` reads as 0);
 * the model evaluates every tree, as Pioneer does.
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
  /*
   * Pf2e compares strictly, so `eq(0, lt(1, 0))` is `0 === false`, false. Pioneer's comparisons give 1 or 0,
   * so it reads that as 0 = 0; the model coerces the same way, a divergence the rules-engine doc lists.
   */
  eq: (left: unknown, right: unknown): boolean => Number(left) === Number(right),
  ne: (left: unknown, right: unknown): boolean => Number(left) !== Number(right),
  gt: (left: number, right: number): boolean => left > right,
  gte: (left: number, right: number): boolean => left >= right,
  lt: (left: number, right: number): boolean => left < right,
  lte: (left: number, right: number): boolean => left <= right,
  ternary: (condition: unknown, ifTrue: unknown, ifFalse: unknown): unknown => {
    const holds = Boolean(condition);
    return holds ? ifTrue : ifFalse;
  },
} as const;

/**
 * The tree as JavaScript, every reference replaced by its value as pf2e's `RuleElementPF2e#replaceFormulaData`
 * does, except that the value is bracketed. pf2e pastes `String(value)` in, so `-@x` with @x = -2 becomes `--2`,
 * a syntax error that falls back to the default; the model, like Pioneer, gives 2.
 */
function javascript(node: FormulaNode, values: Bindings): string {
  switch (node.kind) {
    case NodeKind.Number: {
      return String(node.value);
    }
    case NodeKind.Reference: {
      return `(${String(values.get(node.path))})`;
    }
    case NodeKind.Negate: {
      return `(-${javascript(node.operand, values)})`;
    }
    case NodeKind.Binary: {
      // Through `Watch.op`, which does the same arithmetic and flags zero divisors and unsafe values.
      return `Watch.op("${node.operator}", ${javascript(node.left, values)}, ${javascript(node.right, values)})`;
    }
    case NodeKind.Call: {
      return `Math.${node.name}(${node.args.map((arg) => javascript(arg, values)).join(', ')})`;
    }
    default: {
      return unhandledNode(node);
    }
  }
}

/** What the model saw: the rounded value (unset when JavaScript gave none), and the arithmetic it flagged. */
export interface FoundryOutcome {
  readonly value: FormulaValue | undefined;
  /** Some division, in any branch, had a zero divisor. */
  readonly dividedByZero: boolean;
  /** Some operation, in any branch, left the safe integer range. */
  readonly leftSafeRange: boolean;
}

interface Watch {
  /** Operands may be booleans from pf2e's comparisons; JavaScript arithmetic reads them as 1 and 0. */
  op: (operator: string, left: unknown, right: unknown) => number;
}

/**
 * What Foundry makes of the formula with every reference bound, rounded down. pf2e evaluates every branch of a
 * `ternary`, so the flags cover a superset of what the evaluator reaches.
 */
export function foundryOutcome(node: FormulaNode, values: Bindings): FoundryOutcome {
  let dividedByZero = false;
  let leftSafeRange = false;
  const watch: Watch = {
    op: (operator, leftOperand, rightOperand) => {
      const left = Number(leftOperand);
      const right = Number(rightOperand);
      const results: Readonly<Record<string, number>> = {
        '+': left + right,
        '-': left - right,
        '*': left * right,
        '/': left / right,
      };
      const result = results[operator] ?? Number.NaN;
      dividedByZero ||= operator === '/' && right === 0;
      leftSafeRange ||= Math.abs(result) > Number.MAX_SAFE_INTEGER;
      return result;
    },
  };
  // oxlint-disable-next-line typescript/no-implied-eval, no-new-func -- this models Foundry's own eval of the text; test only, and the text is printed from a tree
  const run = new Function('Math', 'Watch', `"use strict"; return (${javascript(node, values)});`);
  const result: unknown = Reflect.apply(run, undefined, [PF2E_MATH, watch]);
  const floored = Math.floor(Number(result));
  const value = FormulaValue.safeParse(floored === 0 ? 0 : floored);
  return { value: value.success ? value.data : undefined, dividedByZero, leftSafeRange };
}
