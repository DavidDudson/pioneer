/**
 * Templates outside libs/frontier may not style: no `class`, `style`,
 * `[class]`, `[class.x]`, `[style.x]`, `[ngClass]`, `[ngStyle]` or
 * `[attr.class|style]`. Layout and look come from frontier components.
 */
import type { Rule } from 'eslint';

const FRONTIER = /(?:^|\/)libs\/frontier\//u;
const STYLING_NAMES = new Set([
  'class',
  'style',
  '[class]',
  '[style]',
  '[ngClass]',
  '[ngStyle]',
  '[attr.class]',
  '[attr.style]',
]);
const STYLING_PREFIXES = ['[class.', '[style.'];

function isStyling(attribute: string): boolean {
  return STYLING_NAMES.has(attribute) || STYLING_PREFIXES.some((prefix) => attribute.startsWith(prefix));
}

interface TemplateNode {
  readonly sourceSpan?: { readonly start: { readonly offset: number }; readonly end: { readonly offset: number } };
}

export const noTemplateStyling: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow styling attributes in templates outside libs/frontier' },
    messages: { styling: '`{{attribute}}` styles outside frontier. Use frontier components and their token inputs.' },
    schema: [],
  },
  create(context) {
    if (FRONTIER.test(context.filename)) {
      return {};
    }
    const check = (node: unknown): void => {
      const span = (node as TemplateNode).sourceSpan;
      if (span === undefined) {
        return;
      }
      const text = context.sourceCode.text.slice(span.start.offset, span.end.offset);
      const [attribute = text] = text.split('=');
      if (isStyling(attribute)) {
        context.report({
          loc: context.sourceCode.getLocFromIndex(span.start.offset),
          messageId: 'styling',
          data: { attribute },
        });
      }
    };
    return { TextAttribute: check, BoundAttribute: check };
  },
};
