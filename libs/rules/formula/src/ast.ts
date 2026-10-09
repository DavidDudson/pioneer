import type { ValueOf } from '@pioneer/shared/kernel';
import { z } from 'zod';

import type { FormulaFunction } from './functions';
import type { FormulaNumber, ReferencePath, TextPosition } from './units';

/** The four arithmetic operators, all left-associative; `*` and `/` bind tighter than `+` and `-`. */
export const BinaryOperator = { Add: '+', Subtract: '-', Multiply: '*', Divide: '/' } as const;
export type BinaryOperator = ValueOf<typeof BinaryOperator>;
export const BinaryOperatorSchema = z.enum(BinaryOperator);

export const NodeKind = {
  Number: 'number',
  Reference: 'reference',
  Negate: 'negate',
  Binary: 'binary',
  Call: 'call',
} as const;
export type NodeKind = ValueOf<typeof NodeKind>;

/** Every node knows where it starts in the text, so later errors (unknown reference, divide by zero) can point at it. */
interface NodeBase {
  readonly position: TextPosition;
}

export interface NumberNode extends NodeBase {
  readonly kind: typeof NodeKind.Number;
  readonly value: FormulaNumber;
}

/** `@actor.level`: a value the engine supplies when the formula is evaluated. */
export interface ReferenceNode extends NodeBase {
  readonly kind: typeof NodeKind.Reference;
  readonly path: ReferencePath;
}

/** Unary minus. The position is the minus sign's. */
export interface NegateNode extends NodeBase {
  readonly kind: typeof NodeKind.Negate;
  readonly operand: FormulaNode;
}

/** The position is the operator's, which is where a failed division points. */
export interface BinaryNode extends NodeBase {
  readonly kind: typeof NodeKind.Binary;
  readonly operator: BinaryOperator;
  readonly left: FormulaNode;
  readonly right: FormulaNode;
}

/** The position is the function name's. */
export interface CallNode extends NodeBase {
  readonly kind: typeof NodeKind.Call;
  readonly name: FormulaFunction;
  readonly args: readonly FormulaNode[];
}

/** A parsed formula. Parentheses are not kept: the tree's shape is the grouping. */
export type FormulaNode = NumberNode | ReferenceNode | NegateNode | BinaryNode | CallNode;

/** The `default` of an exhaustive switch over node kinds: unreachable while every kind has a case. */
export function unhandledNode(node: never): never {
  throw new TypeError(`Unhandled formula node: ${JSON.stringify(node)}`);
}
