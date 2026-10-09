import { NodeKind, unhandledNode } from './ast';
import type { FormulaNode } from './ast';
import type { ReferencePath, TextPosition } from './units';

/** One `@` reference in a formula, with where it was written. */
export interface FormulaReference {
  readonly path: ReferencePath;
  readonly position: TextPosition;
}

/** A node's direct children, left to right. */
function children(node: FormulaNode): readonly FormulaNode[] {
  switch (node.kind) {
    case NodeKind.Number:
    case NodeKind.Reference: {
      return [];
    }
    case NodeKind.Negate: {
      return [node.operand];
    }
    case NodeKind.Binary: {
      return [node.left, node.right];
    }
    case NodeKind.Call: {
      return node.args;
    }
    default: {
      return unhandledNode(node);
    }
  }
}

function collect(node: FormulaNode, into: FormulaReference[]): void {
  if (node.kind === NodeKind.Reference) {
    into.push({ path: node.path, position: node.position });
  }
  for (const child of children(node)) {
    collect(child, into);
  }
}

/**
 * Every reference in a formula, in the order written, repeats included. The statistic graph uses the
 * paths as dependency edges; the positions let a checker point at an unknown one.
 */
export function references(formula: FormulaNode): FormulaReference[] {
  const found: FormulaReference[] = [];
  collect(formula, found);
  return found;
}
