/**
 * Pioneer never interrupts: no modals, no toasts, no full page loads.
 * Templates may not use `<dialog>`, `popover`, `role="dialog|alertdialog"`,
 * or an internal `href` (which reloads the document; use `routerLink`).
 * Feedback lives inline, next to the thing it is about.
 */
import type { Rule } from 'eslint';

const OVERLAY_ROLES = new Set(['dialog', 'alertdialog']);
/** Hrefs that leave the app, so a document load is expected. */
const EXTERNAL_HREF = /^(?:https?:|mailto:|tel:)/u;

interface Span {
  readonly start: { readonly offset: number };
}
interface ElementNode {
  readonly name?: unknown;
  readonly startSourceSpan?: Span;
}
interface AttributeNode {
  readonly name?: unknown;
  readonly value?: unknown;
  readonly keySpan?: Span;
}

export const noInterruptions: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow modals, toasts and full page loads in templates' },
    messages: {
      dialog: '`<dialog>` is a modal. Show the content inline or route to it.',
      popover: '`popover` overlays the page. Show the content inline.',
      role: '`role="{{role}}"` is a modal. Show the content inline or route to it.',
      href: 'Internal `href` reloads the whole page. Use `routerLink`.',
      boundHref: 'Bound `href` may reload the whole page. Use `routerLink`, or a literal external `href`.',
    },
    schema: [],
  },
  create(context) {
    const report = (span: Span | undefined, messageId: string, data: Readonly<Record<string, string>> = {}): void => {
      if (span !== undefined) {
        context.report({ loc: context.sourceCode.getLocFromIndex(span.start.offset), messageId, data });
      }
    };
    return {
      Element(node: unknown): void {
        const { name, startSourceSpan } = node as ElementNode;
        if (name === 'dialog') {
          report(startSourceSpan, 'dialog');
        }
      },
      TextAttribute(node: unknown): void {
        const { name, value, keySpan } = node as AttributeNode;
        if (name === 'popover') {
          report(keySpan, 'popover');
        } else if (name === 'role' && typeof value === 'string' && OVERLAY_ROLES.has(value)) {
          report(keySpan, 'role', { role: value });
        } else if (name === 'href' && typeof value === 'string' && !EXTERNAL_HREF.test(value)) {
          report(keySpan, 'href');
        }
      },
      // Bound names arrive without brackets or `attr.`: `[attr.href]` is `href`.
      BoundAttribute(node: unknown): void {
        const { name, keySpan } = node as AttributeNode;
        if (name === 'popover') {
          report(keySpan, 'popover');
        } else if (name === 'href') {
          report(keySpan, 'boundHref');
        }
      },
    };
  },
};
