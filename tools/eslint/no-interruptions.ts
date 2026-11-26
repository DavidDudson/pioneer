/**
 * Pioneer never interrupts: no modals, no toasts, no full page loads. Popovers are allowed (ADR-0065).
 * Templates may not use `<dialog>`, `role="dialog|alertdialog"`,
 * or an internal `href` (which reloads the document; use `routerLink`).
 * Feedback lives inline, next to the thing it is about.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

import { Start } from './template-nodes.ts';
import type { VisitedNode } from './template-nodes.ts';

const OVERLAY_ROLES = new Set(['dialog', 'alertdialog']);

/** Hrefs that leave the app, so a document load is expected. */
const EXTERNAL_HREF = /^(?:https?:|mailto:|tel:)/u;

const ElementNode = z.looseObject({ name: z.string(), startSourceSpan: Start });

const TextAttributeNode = z.looseObject({ name: z.string(), value: z.string(), keySpan: Start });

const BoundAttributeNode = z.looseObject({ name: z.string(), keySpan: Start });

export const noInterruptions: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow modals, toasts and full page loads in templates' },
    messages: {
      dialog: '`<dialog>` is a modal. Show the content inline or route to it.',
      role: '`role="{{role}}"` is a modal. Show the content inline or route to it.',
      href: 'Internal `href` reloads the whole page. Use `routerLink`.',
      boundHref: 'Bound `href` may reload the whole page. Use `routerLink`, or a literal external `href`.',
    },
    schema: [],
  },
  create(context) {
    const report = (span: Start, messageId: string, data: Readonly<Record<string, string>> = {}): void => {
      context.report({ loc: context.sourceCode.getLocFromIndex(span.start.offset), messageId, data });
    };

    return {
      Element(node: VisitedNode): void {
        const element = ElementNode.safeParse(node);

        if (element.success && element.data.name === 'dialog') {
          report(element.data.startSourceSpan, 'dialog');
        }
      },
      TextAttribute(node: VisitedNode): void {
        const attribute = TextAttributeNode.safeParse(node);

        if (!attribute.success) {
          return;
        }

        const { name, value, keySpan } = attribute.data;

        if (name === 'role' && OVERLAY_ROLES.has(value)) {
          report(keySpan, 'role', { role: value });
        } else if (name === 'href' && !EXTERNAL_HREF.test(value)) {
          report(keySpan, 'href');
        }
      },
      // Bound names arrive without brackets or `attr.`: `[attr.href]` is `href`.
      BoundAttribute(node: VisitedNode): void {
        const attribute = BoundAttributeNode.safeParse(node);

        if (attribute.success && attribute.data.name === 'href') {
          report(attribute.data.keySpan, 'boundHref');
        }
      },
    };
  },
};
