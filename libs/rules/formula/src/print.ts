import { z } from 'zod';

import { BinaryOperator, NodeKind, unhandledNode } from './ast';
import type { FormulaNode } from './ast';
import { FormulaText } from './units';

/** How tightly a node binds: a child that binds looser than its parent needs parentheses. */
const Precedence = z.int().positive().brand<'Precedence'>();
type Precedence = z.infer<typeof Precedence>;

const SUM = Precedence.parse(1);
const PRODUCT = Precedence.parse(2);
const NEGATION = Precedence.parse(3);
const ATOM = Precedence.parse(4);

function precedenceOfOperator(operator: BinaryOperator): Precedence {
  return operator === BinaryOperator.Add || operator === BinaryOperator.Subtract ? SUM : PRODUCT;
}

function precedence(node: FormulaNode): Precedence {
  switch (node.kind) {
    case NodeKind.Binary: {
      return precedenceOfOperator(node.operator);
    }
    case NodeKind.Negate: {
      return NEGATION;
    }
    case NodeKind.Number:
    case NodeKind.Reference:
    case NodeKind.Call: {
      return ATOM;
    }
    default: {
      return unhandledNode(node);
    }
  }
}

/** `node` as text, in parentheses when it binds looser than `floor`. */
function operand(node: FormulaNode, floor: Precedence): FormulaText {
  const text = printFormula(node);
  return precedence(node) < floor ? FormulaText.parse(`(${text})`) : text;
}

/**
 * Canonical text for a formula: single spaces around operators, `, ` between arguments, and only the
 * parentheses the tree needs. Parsing it gives the same tree back.
 */
export function printFormula(node: FormulaNode): FormulaText {
  switch (node.kind) {
    case NodeKind.Number: {
      return FormulaText.parse(String(node.value));
    }
    case NodeKind.Reference: {
      return FormulaText.parse(`@${node.path}`);
    }
    case NodeKind.Negate: {
      return FormulaText.parse(`-${operand(node.operand, NEGATION)}`);
    }
    case NodeKind.Binary: {
      const level = precedenceOfOperator(node.operator);
      // Operators are left-associative, so an equal-precedence right operand keeps its parentheses.
      const right = operand(node.right, Precedence.parse(level + 1));
      return FormulaText.parse(`${operand(node.left, level)} ${node.operator} ${right}`);
    }
    case NodeKind.Call: {
      return FormulaText.parse(`${node.name}(${node.args.map((arg) => printFormula(arg)).join(', ')})`);
    }
    default: {
      return unhandledNode(node);
    }
  }
}
