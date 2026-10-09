/**
 * No user-facing text in templates (ADR-0009): copy comes from message keys
 * through the `transloco` pipe, so every locale can translate it. Flags text
 * with letters between tags or around `{{ }}`, and literal values of
 * attributes and inputs that carry text (`aria-label`, `placeholder`,
 * `label`, ...). Text without letters (`·`, `✓`, `▾`, `+`) is a glyph, not
 * copy, and stays allowed.
 */
import type { Rule } from 'eslint';

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

interface Span {
  readonly start: { readonly offset: number };
}
interface TextNode {
  readonly value?: unknown;
  readonly sourceSpan?: Span;
}
interface InterpolationAst {
  readonly strings?: unknown;
}
interface BoundTextNode {
  readonly value?: { readonly ast?: InterpolationAst };
  readonly sourceSpan?: Span;
}
interface AttributeNode {
  readonly name?: unknown;
  readonly value?: unknown;
  readonly keySpan?: Span;
}
/** `[label]="'Name'"`: the bound expression, which is a string literal when the copy is inline. */
interface BoundAttributeNode {
  readonly name?: unknown;
  readonly value?: { readonly ast?: { readonly value?: unknown } };
  readonly keySpan?: Span;
}

function hasLetters(value: unknown): boolean {
  return typeof value === 'string' && LETTER.test(value);
}

/** Literal parts of `Level {{ level }}`: `['Level ', '']`. */
function literalParts(node: BoundTextNode): readonly unknown[] {
  const strings = node.value?.ast?.strings;
  return Array.isArray(strings) ? strings : [];
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
    const report = (span: Span | undefined, messageId: string, data: Readonly<Record<string, string>>): void => {
      if (span !== undefined) {
        context.report({ loc: context.sourceCode.getLocFromIndex(span.start.offset), messageId, data });
      }
    };
    return {
      Text(node: unknown): void {
        const { value, sourceSpan } = node as TextNode;
        if (hasLetters(value)) {
          report(sourceSpan, 'text', { text: String(value).trim() });
        }
      },
      BoundText(node: unknown): void {
        const bound = node as BoundTextNode;
        const copy = literalParts(bound).filter((part) => hasLetters(part));
        if (copy.length > 0) {
          report(bound.sourceSpan, 'text', { text: copy.join(' ').trim() });
        }
      },
      TextAttribute(node: unknown): void {
        const { name, value, keySpan } = node as AttributeNode;
        if (typeof name === 'string' && TEXT_ATTRIBUTES.has(name) && hasLetters(value)) {
          report(keySpan, 'attribute', { name, text: String(value) });
        }
      },
      BoundAttribute(node: unknown): void {
        const { name, value, keySpan } = node as BoundAttributeNode;
        const literal = value?.ast?.value;
        if (typeof name === 'string' && TEXT_ATTRIBUTES.has(name) && hasLetters(literal)) {
          report(keySpan, 'attribute', { name, text: String(literal) });
        }
      },
    };
  },
};
