/**
 * A figure in `fr-text` needs `numeric`, so its digits are tabular and lining. A template has no types,
 * so a figure is recognised by what it is called: an `fr-text` whose only content is one interpolation reading
 * `modifier`, `bonus`, `total`, `dc`, `ac`, `score`, `count` or `bulk`. Not flagged: a `numeric` or `monospace` text
 * (the mono face is fixed width already), a `minWidth` text (a figure by definition) and prose around a figure.
 * `libs/frontier` is exempt, as it knows no schemas.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

import { Span } from './template-nodes.ts';
import type { VisitedNode } from './template-nodes.ts';

const FRONTIER = /(?:^|\/)libs\/frontier\//u;

/** The whole content of the element: one interpolation. */
const INTERPOLATION = /^\s*\{\{(?<expression>[^{}]*)\}\}\s*$/u;
const CALL_SUFFIX = /\(\)$/u;
const FIGURE_NAMES = new Set(['modifier', 'bonus', 'total', 'dc', 'ac', 'score', 'count', 'bulk']);

/** An input that already gives the text aligned digits. */
const ALIGNED = /\s\[?(?:numeric|monospace|minWidth)\]?[=\s>]/u;

const ElementNode = z.looseObject({ name: z.string(), sourceSpan: Span, startSourceSpan: Span });

export const numericFigures: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Require `numeric` on an fr-text that shows a figure' },
    messages: {
      figure: '`<fr-text>` shows `{{name}}`, a figure. Add `numeric` so its digits are tabular and lining.',
    },
    schema: [],
  },
  create(context) {
    if (FRONTIER.test(context.filename)) {
      return {};
    }

    return {
      Element(node: VisitedNode): void {
        const element = ElementNode.safeParse(node);

        if (!element.success || element.data.name !== 'fr-text') {
          return;
        }

        const { sourceSpan, startSourceSpan } = element.data;
        const { text } = context.sourceCode;
        const openTag = text.slice(startSourceSpan.start.offset, startSourceSpan.end.offset);
        const content = text.slice(startSourceSpan.end.offset, sourceSpan.end.offset).replace(/<\/fr-text>\s*$/u, '');
        const expression = INTERPOLATION.exec(content)?.groups?.['expression'];
        const name = expression?.trim().replace(CALL_SUFFIX, '').split('.').at(-1);

        if (name === undefined || !FIGURE_NAMES.has(name) || ALIGNED.test(openTag)) {
          return;
        }

        context.report({
          loc: context.sourceCode.getLocFromIndex(sourceSpan.start.offset),
          messageId: 'figure',
          data: { name },
        });
      },
    };
  },
};
