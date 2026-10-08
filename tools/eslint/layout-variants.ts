/**
 * Frontier template classes: no viewport breakpoints, and container query
 * variants only inside the layout primitives. See tools/layout-variants.ts.
 */
import type { Rule } from 'eslint';

import { LAYOUT_PRIMITIVE, LAYOUT_VARIANT_MESSAGES, layoutVariantProblem } from '../layout-variants';

interface AttributeNode {
  readonly name?: unknown;
  readonly value?: unknown;
  readonly valueSpan?: { readonly start: { readonly offset: number } };
}

export const layoutVariants: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Restrict responsive variants in frontier template classes to layout primitives' },
    messages: LAYOUT_VARIANT_MESSAGES,
    schema: [],
  },
  create(context) {
    const inPrimitive = LAYOUT_PRIMITIVE.test(context.filename);
    return {
      TextAttribute(node: unknown): void {
        const { name, value, valueSpan } = node as AttributeNode;
        if (name !== 'class' || typeof value !== 'string' || valueSpan === undefined) {
          return;
        }
        const problem = layoutVariantProblem(value, inPrimitive);
        if (problem !== undefined) {
          context.report({
            loc: context.sourceCode.getLocFromIndex(valueSpan.start.offset),
            messageId: problem.messageId,
            data: { variant: problem.variant },
          });
        }
      },
    };
  },
};
