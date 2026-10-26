import { FormulaText, NodeKind, parseFormula, printFormula, ReferencePath } from '@pioneer/rules/formula';
import type { FormulaNode } from '@pioneer/rules/formula';
import { fromFoundryBadgePath, fromFoundryPath } from '@pioneer/rules/sdk';

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

const REFERENCE_TOKEN = /@[\w.-]+/gu;

/**
 * A rolled badge's formula with each reference translated in place: `(@actor.flags.system.consumeFear)d8` is dice
 * with a counted formula, which does not parse as a formula whole. A reference with no translation stays as Foundry
 * wrote it, so the badge fails and is reported. Unlike `fromFoundryFormula`, it also translates the actor flags a
 * badge reads (`@flag.<flag>`).
 */
export function fromFoundryBadgeFormula(text: string): string {
  return text.replaceAll(REFERENCE_TOKEN, (token) => {
    const path = ReferencePath.safeParse(token.slice(1));
    const pioneer = path.success ? fromFoundryBadgePath(path.data) : undefined;
    return pioneer === undefined ? token : `@${pioneer}`;
  });
}
