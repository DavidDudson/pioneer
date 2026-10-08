/**
 * Templates outside libs/frontier may not style at all: no `class`, `style`,
 * `[class]`, `[class.x]`, `[style.x]`, `[ngClass]`, `[ngStyle]` or
 * `[attr.class|style]`. Layout and look come from frontier components.
 *
 * Inside frontier the only styling a template may do is `[class]="…"` bound
 * to a cva result in the component, so every class string lives in
 * TypeScript where the `class-tokens` rule checks it against the tokens.
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
/** The one styling binding frontier templates may use. */
const CVA_BINDING = '[class]';

function isStyling(attribute: string): boolean {
  return STYLING_NAMES.has(attribute) || STYLING_PREFIXES.some((prefix) => attribute.startsWith(prefix));
}

interface TemplateNode {
  readonly sourceSpan?: { readonly start: { readonly offset: number }; readonly end: { readonly offset: number } };
}

export const noTemplateStyling: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow styling attributes in templates (frontier: only [class] bound to a cva)' },
    messages: {
      styling: '`{{attribute}}` styles outside frontier. Use frontier components and their token inputs.',
      frontier: '`{{attribute}}` in a frontier template. Bind `[class]` to a cva in the component instead.',
    },
    schema: [],
  },
  create(context) {
    const inFrontier = FRONTIER.test(context.filename);
    const check = (node: unknown): void => {
      const span = (node as TemplateNode).sourceSpan;
      if (span === undefined) {
        return;
      }
      const text = context.sourceCode.text.slice(span.start.offset, span.end.offset);
      const [attribute = text] = text.split('=');
      if (!isStyling(attribute) || (inFrontier && attribute === CVA_BINDING)) {
        return;
      }
      context.report({
        loc: context.sourceCode.getLocFromIndex(span.start.offset),
        messageId: inFrontier ? 'frontier' : 'styling',
        data: { attribute },
      });
    };
    return { TextAttribute: check, BoundAttribute: check };
  },
};
