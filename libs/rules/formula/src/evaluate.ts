import { message } from '@pioneer/shared/kernel';
import type { MessageDescriptor } from '@pioneer/shared/kernel';

import { BinaryOperator, NodeKind, unhandledNode } from './ast';
import type { BinaryNode, CallNode, FormulaNode, ReferenceNode } from './ast';
import { FormulaError } from './formula-error';
import { FormulaFunction } from './functions';
import { FormulaMessage } from './messages';
import { FORMULA_VALUE_MAX, FormulaValue, PartialValue } from './units';
import type { ReferencePath, TextPosition } from './units';

/**
 * Supplies a reference's value, or `undefined` when the reference is unknown. It should be pure: the
 * evaluator calls it once for each reference it reaches, in the order written.
 */
export type ResolveReference = (path: ReferencePath) => FormulaValue | undefined;

export interface EvaluateSuccess {
  readonly ok: true;
  readonly value: FormulaValue;
}

/** What went wrong, as a message descriptor, and the position of the node that failed. */
export interface EvaluateFailure {
  readonly ok: false;
  readonly error: MessageDescriptor;
  readonly position: TextPosition;
}

export type EvaluateOutcome = EvaluateSuccess | EvaluateFailure;

const ZERO = PartialValue.parse(0);
const TRUE = PartialValue.parse(1);
const FALSE = ZERO;
const REFERENCE_SIGIL = '@';

function fail(descriptor: MessageDescriptor, position: TextPosition): never {
  throw new FormulaError(descriptor, position);
}

/** `value` as a partial value, failing at `position` when it is outside the safe integer range. */
function inRange(value: unknown, position: TextPosition): PartialValue {
  const checked = PartialValue.safeParse(value);
  return checked.success
    ? checked.data
    : fail(message(FormulaMessage.OutOfRange, { maximum: FORMULA_VALUE_MAX, position }), position);
}

type Apply = (values: readonly PartialValue[]) => PartialValue;

/** `fn` on a one-argument call's value. */
const unary =
  (fn: (value: PartialValue) => unknown): Apply =>
  ([value = ZERO]) =>
    PartialValue.parse(fn(value));

/** A comparison, 1 when it holds and 0 when it does not, as pf2e's helpers give `true` and `false`. */
const comparison =
  (holds: (left: PartialValue, right: PartialValue) => boolean): Apply =>
  ([left = ZERO, right = ZERO]) =>
    holds(left, right) ? TRUE : FALSE;

/** Every function but `ternary`, on evaluated arguments; the parser has checked the count. */
const APPLY: Readonly<Record<Exclude<FormulaFunction, typeof FormulaFunction.Ternary>, Apply>> = {
  [FormulaFunction.Min]: (values) => PartialValue.parse(Math.min(...values)),
  [FormulaFunction.Max]: (values) => PartialValue.parse(Math.max(...values)),
  [FormulaFunction.Floor]: unary(Math.floor),
  [FormulaFunction.Ceil]: unary(Math.ceil),
  [FormulaFunction.Abs]: unary(Math.abs),
  [FormulaFunction.Round]: unary(Math.round),
  [FormulaFunction.Sign]: unary(Math.sign),
  [FormulaFunction.Eq]: comparison((left, right) => left === right),
  [FormulaFunction.Ne]: comparison((left, right) => left !== right),
  [FormulaFunction.Gt]: comparison((left, right) => left > right),
  [FormulaFunction.Gte]: comparison((left, right) => left >= right),
  [FormulaFunction.Lt]: comparison((left, right) => left < right),
  [FormulaFunction.Lte]: comparison((left, right) => left <= right),
};

/**
 * Walks the tree, carrying `resolve`. Arithmetic is JavaScript's, as in Foundry's `Roll.safeEval`, so
 * `@level / 2` is a fraction until a `floor` or the final rounding removes it.
 */
class Evaluator {
  readonly #resolve: ResolveReference;

  public constructor(resolve: ResolveReference) {
    this.#resolve = resolve;
  }

  public value(node: FormulaNode): PartialValue {
    switch (node.kind) {
      case NodeKind.Number: {
        return PartialValue.parse(node.value);
      }
      case NodeKind.Reference: {
        return this.#reference(node);
      }
      case NodeKind.Negate: {
        return PartialValue.parse(ZERO - this.value(node.operand));
      }
      case NodeKind.Binary: {
        return this.#binary(node);
      }
      case NodeKind.Call: {
        return this.#call(node);
      }
      default: {
        return unhandledNode(node);
      }
    }
  }

  #reference(node: ReferenceNode): PartialValue {
    const { path, position } = node;
    const value = this.#resolve(path);
    return value === undefined
      ? fail(message(FormulaMessage.UnknownReference, { found: `${REFERENCE_SIGIL}${path}`, position }), position)
      : PartialValue.parse(value);
  }

  #binary(node: BinaryNode): PartialValue {
    const left = this.value(node.left);
    const right = this.value(node.right);
    const { position } = node;
    switch (node.operator) {
      case BinaryOperator.Add: {
        return inRange(left + right, position);
      }
      case BinaryOperator.Subtract: {
        return inRange(left - right, position);
      }
      case BinaryOperator.Multiply: {
        return inRange(left * right, position);
      }
      case BinaryOperator.Divide: {
        if (right === ZERO) {
          return fail(message(FormulaMessage.DivisionByZero, { position }), position);
        }
        return inRange(left / right, position);
      }
      default: {
        const unreachable: never = node.operator;
        throw new TypeError(`Unhandled formula operator: ${String(unreachable)}`);
      }
    }
  }

  #call(node: CallNode): PartialValue {
    const { args } = node;
    // Only the branch taken is evaluated, so the other may divide by zero or name an unknown reference.
    if (node.name === FormulaFunction.Ternary) {
      const [condition, ifTrue, ifFalse] = args;
      if (condition === undefined || ifTrue === undefined || ifFalse === undefined) {
        throw new TypeError('ternary takes three arguments; the parser checks this');
      }
      return this.value(condition) === ZERO ? this.value(ifFalse) : this.value(ifTrue);
    }
    const values = args.map((arg) => this.value(arg));
    return APPLY[node.name](values);
  }
}

/** The whole number a formula's value rounds to: down, as PF2e rounds unless a rule says otherwise. */
function rounded(value: PartialValue): FormulaValue {
  const floored = Math.floor(value);
  // `-0` (from `-0` or `sign(-0)`) is reported as plain 0.
  return FormulaValue.parse(floored === 0 ? 0 : floored);
}

/**
 * Evaluates a parsed formula against reference values supplied by `resolve`. Pure and deterministic: the
 * same formula and values always give the same outcome. Never throws (unless `resolve` does): an unknown
 * reference, a division by zero or a value outside the safe integer range is a failed outcome pointing at
 * the node that failed. The result is rounded down to a whole number.
 */
export function evaluate(formula: FormulaNode, resolve: ResolveReference): EvaluateOutcome {
  try {
    return { ok: true, value: rounded(new Evaluator(resolve).value(formula)) };
  } catch (error) {
    if (error instanceof FormulaError) {
      return { ok: false, error: error.descriptor, position: error.position };
    }
    throw error;
  }
}
