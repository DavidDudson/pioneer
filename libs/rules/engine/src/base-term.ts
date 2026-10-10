import { BinaryOperator, evaluate, FormulaValue, NodeKind, printFormula, references } from '@pioneer/rules/formula';
import type { FormulaNode, FormulaText, ResolveReference, TextPosition } from '@pioneer/rules/formula';
import { knownReference, ReferenceKind } from '@pioneer/rules/sdk';
import type { Origin } from '@pioneer/rules/sdk';
import type { ValueOf } from '@pioneer/shared/kernel';

export const BaseTermKind = { Term: 'term', Rounding: 'rounding' } as const;
export type BaseTermKind = ValueOf<typeof BaseTermKind>;

/** Whether a term is added to the base or subtracted from it. */
export const TermSign = { Plus: '+', Minus: '-' } as const;
export type TermSign = ValueOf<typeof TermSign>;

/**
 * One line of a statistic's base: a top-level term of its base formula (`10`, `@attr.dex.capped`, `@prof.ac`) with
 * the value it adds, sign included. A formula whose terms round differently on their own than together gets a
 * rounding line, so the lines always add up to the base.
 */
export type BaseTerm =
  | {
      readonly kind: typeof BaseTermKind.Term;
      /** Where the value comes from: the term as Pioneer prints it, without its sign. */
      readonly formula: FormulaText;
      readonly sign: TermSign;
      readonly value: FormulaValue;
      /** Where the term's first number, reference or call is written in the base formula; brackets are not kept. */
      readonly position: TextPosition;
      /**
       * Who replaced how proficiency becomes a bonus (a variant rule), on a term that reads `@prof`; undefined while
       * the content's own table is in force.
       */
      readonly origin: Origin | undefined;
    }
  | { readonly kind: typeof BaseTermKind.Rounding; readonly value: FormulaValue };

interface SignedNode {
  readonly node: FormulaNode;
  readonly sign: TermSign;
}

/** The terms of a sum, left to right: `a + b - c` gives `a`, `b` and `-c`. A bracketed sum stays one term. */
function terms(node: FormulaNode, sign: TermSign = TermSign.Plus): SignedNode[] {
  if (
    node.kind !== NodeKind.Binary ||
    (node.operator !== BinaryOperator.Add && node.operator !== BinaryOperator.Subtract)
  ) {
    return [{ node, sign }];
  }
  const right = node.operator === BinaryOperator.Add ? TermSign.Plus : TermSign.Minus;
  return [...terms(node.left, sign), { node: node.right, sign: right }];
}

/** Where a node's first leaf or call is written: a binary node's own position is its operator's. */
function start(node: FormulaNode): TextPosition {
  return node.kind === NodeKind.Binary ? start(node.left) : node.position;
}

/** Whether a term reads a proficiency bonus (`@prof.<selector>`). */
function readsProficiency(node: FormulaNode): boolean {
  return references(node).some(({ path }) => knownReference(path)?.kind === ReferenceKind.ProficiencyBonus);
}

/** The term as evaluated on its own, negated when subtracted so it rounds as it does in the sum. */
function signed({ node, sign }: SignedNode): FormulaNode {
  return sign === TermSign.Plus ? node : { kind: NodeKind.Negate, operand: node, position: node.position };
}

/** What the whole base formula came to, and the origin of the proficiency bonuses it read, if a rule replaced them. */
interface Evaluated {
  readonly total: FormulaValue;
  readonly proficiencyOrigin: Origin | undefined;
}

/**
 * The base formula's terms with their values, given that the whole formula evaluated to `total` with `resolve`.
 * Each term is evaluated on its own; when their sum misses `total` (`@level / 2 + @level / 2` at an odd level), a
 * rounding line makes up the difference. A term reading `@prof` carries `proficiencyOrigin`, the variant rule that
 * replaced the proficiency bonuses, if any.
 */
export function baseTerms(
  formula: FormulaNode,
  resolve: ResolveReference,
  { total, proficiencyOrigin }: Evaluated,
): readonly BaseTerm[] {
  const lines: BaseTerm[] = [];
  let sum = 0;
  for (const term of terms(formula)) {
    const outcome = evaluate(signed(term), resolve);
    // The whole formula evaluated, so each of its terms does too; a failure here would be a bug in the evaluator.
    if (!outcome.ok) {
      throw new TypeError(`A term of an evaluated formula failed: ${outcome.error.key}`);
    }
    sum += outcome.value;
    lines.push({
      kind: BaseTermKind.Term,
      formula: printFormula(term.node),
      sign: term.sign,
      value: outcome.value,
      position: start(term.node),
      origin: readsProficiency(term.node) ? proficiencyOrigin : undefined,
    });
  }
  return sum === total ? lines : [...lines, { kind: BaseTermKind.Rounding, value: FormulaValue.parse(total - sum) }];
}
