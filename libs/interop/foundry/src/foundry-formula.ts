import { FormulaText, NodeKind, parseFormula, printFormula } from '@pioneer/rules/formula';
import type { FormulaNode } from '@pioneer/rules/formula';
import { fromFoundryPath } from '@pioneer/rules/sdk';

/**
 * Foundry formulas in Pioneer's reference spelling (ADR-0016): `@actor.level` becomes `@level`. A reference with no
 * translation is kept as Foundry wrote it, so the rule element that holds it fails `RuleElement` and is reported.
 */

function translated(node: FormulaNode): FormulaNode {
  switch (node.kind) {
    case NodeKind.Number: {
      return node;
    }
    case NodeKind.Reference: {
      return { ...node, path: fromFoundryPath(node.path) ?? node.path };
    }
    case NodeKind.Negate: {
      return { ...node, operand: translated(node.operand) };
    }
    case NodeKind.Binary: {
      return { ...node, left: translated(node.left), right: translated(node.right) };
    }
    case NodeKind.Call: {
      return { ...node, args: node.args.map((arg) => translated(arg)) };
    }
    default: {
      return node;
    }
  }
}

/**
 * `text` with its Foundry references translated, printed canonically; `text` itself when it holds no reference or
 * is not a formula Pioneer parses (Foundry's `{item|...}` injections, say).
 */
export function fromFoundryFormula(text: string): string {
  const formula = FormulaText.safeParse(text);
  const parsed = formula.success ? parseFormula(formula.data) : undefined;
  if (parsed?.ok !== true || !text.includes('@')) {
    return text;
  }
  return printFormula(translated(parsed.formula));
}
