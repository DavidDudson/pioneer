/**
 * No user-facing text in templates (ADR-0009): copy comes from message keys
 * through the `transloco` pipe, so every locale can translate it. Flags text
 * with letters between tags or around `{{ }}`, and literal values of
 * attributes and inputs that carry text (`aria-label`, `placeholder`,
 * `label`, ...). Text without letters (`·`, `✓`, `▾`, `+`) is a glyph, not
 * copy, and stays allowed.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

import { Start } from './template-nodes';
import type { VisitedNode } from './template-nodes';

/** Any letter in any script: what makes text translatable copy rather than a glyph. */
const LETTER = /\p{L}/u;

/** Attributes and component inputs whose literal value is shown or read to the user. */
const TEXT_ATTRIBUTES = new Set([
  'alt',
  'aria-description',
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'ariaLabel',
  'attribution',
  'brand',
  'description',
  'errorMessage',
  'expansion',
  'hint',
  'label',
  'pendingLabel',
  'placeholder',
  'successLabel',
  'term',
  'title',
]);

const TextNode = z.looseObject({ value: z.string(), sourceSpan: Start });

const StringsAst = z.looseObject({ strings: z.array(z.string()) });
const BoundTextNode = z.looseObject({ value: z.looseObject({ ast: StringsAst }), sourceSpan: Start });

const TextAttributeNode = z.looseObject({ name: z.string(), value: z.string(), keySpan: Start });

/** `[label]="'Name'"`: the bound expression, which is a string literal when the copy is inline. */
const ValueAst = z.looseObject({ value: z.string() });
const BoundAttributeNode = z.looseObject({ name: z.string(), value: z.looseObject({ ast: ValueAst }), keySpan: Start });

function hasLetters(value: string): boolean {
  return LETTER.test(value);
}

export const noLiteralText: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow literal user-facing text in templates; use message keys' },
    messages: {
      text: 'Literal text "{{text}}". Interpolate a message key through the transloco pipe.',
      attribute: 'Literal {{name}}="{{text}}". Bind {{name}} to a message key through the transloco pipe.',
    },
    schema: [],
  },
  create(context) {
    const report = (span: Start, messageId: string, data: Readonly<Record<string, string>>): void => {
      context.report({ loc: context.sourceCode.getLocFromIndex(span.start.offset), messageId, data });
    };

    return {
      Text(node: VisitedNode): void {
        const text = TextNode.safeParse(node);

        if (text.success && hasLetters(text.data.value)) {
          report(text.data.sourceSpan, 'text', { text: text.data.value.trim() });
        }
      },
      BoundText(node: VisitedNode): void {
        const bound = BoundTextNode.safeParse(node);

        if (!bound.success) {
          return;
        }

        const copy = bound.data.value.ast.strings.filter((part) => hasLetters(part));

        if (copy.length > 0) {
          report(bound.data.sourceSpan, 'text', { text: copy.join(' ').trim() });
        }
      },
      TextAttribute(node: VisitedNode): void {
        const attribute = TextAttributeNode.safeParse(node);

        if (!attribute.success) {
          return;
        }

        const { name, value, keySpan } = attribute.data;

        if (TEXT_ATTRIBUTES.has(name) && hasLetters(value)) {
          report(keySpan, 'attribute', { name, text: value });
        }
      },
      BoundAttribute(node: VisitedNode): void {
        const attribute = BoundAttributeNode.safeParse(node);

        if (!attribute.success) {
          return;
        }

        const { name, value, keySpan } = attribute.data;
        const literal = value.ast.value;

        if (TEXT_ATTRIBUTES.has(name) && hasLetters(literal)) {
          report(keySpan, 'attribute', { name, text: literal });
        }
      },
    };
  },
};
