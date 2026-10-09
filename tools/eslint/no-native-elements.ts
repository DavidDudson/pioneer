/**
 * Templates build UI from frontier components, never from raw HTML.
 *
 * Outside libs/frontier only components are allowed: `fr-*` (frontier),
 * `pio-*` (the app's own), and Angular's structural elements. Need a native
 * element? Add (or extend) a frontier component and give it cva variants.
 *
 * Inside frontier each native element that carries behaviour or semantics
 * has exactly one owning primitive: only `fr-button` renders `<button>`, only
 * the text controls render `<input>`, and so on. Everything else composes
 * those primitives (`<svg>` only in `fr-icon`, which draws Lucide icons).
 * Structural elements (`div`, `span`, landmarks) stay free inside frontier.
 */
import type { Rule } from 'eslint';

const FRONTIER = /(?:^|\/)libs\/frontier\/src\/lib\//u;
const ALLOWED_OUTSIDE = /^(?:fr-|pio-)|^(?:ng-container|ng-template|ng-content|router-outlet)$/u;

/** Native element → the frontier directories allowed to render it. Empty: nobody (add a primitive first). */
const OWNERS: ReadonlyMap<string, readonly string[]> = new Map([
  ['a', ['actions/link/']],
  ['button', ['actions/button/', 'controls/select/']],
  ['input', ['controls/text-input/', 'controls/number-input/', 'controls/date-input/']],
  ['label', ['forms/field/label/']],
  ['form', ['forms/form/', 'forms/async-form/']],
  ['h1', ['text/heading/']],
  ['h2', ['text/heading/']],
  ['h3', ['text/heading/']],
  ['h4', ['text/heading/']],
  ['h5', []],
  ['h6', []],
  ['p', ['text/text/']],
  ['ul', ['list/list/']],
  ['ol', ['list/list/']],
  ['li', ['list/list-item/']],
  ['dl', ['list/description-list/']],
  ['dt', ['list/description-item/']],
  ['dd', ['list/description-item/']],
  ['table', ['data/table/']],
  ['caption', ['data/table/']],
  ['thead', ['data/table/']],
  ['tbody', ['data/table/']],
  ['tfoot', ['data/table/']],
  ['tr', ['data/table/']],
  ['th', ['data/table/']],
  ['td', ['data/table/']],
  ['time', ['date/']],
  ['details', ['layout/disclosure/']],
  ['summary', ['layout/disclosure/']],
  ['hr', ['layout/divider/']],
  ['svg', ['icon/']],
  ['select', []],
  ['textarea', ['controls/text-area/']],
  ['img', []],
  ['iframe', []],
]);

interface ElementNode {
  readonly name?: unknown;
  readonly startSourceSpan?: { readonly start: { readonly offset: number } };
}

export const noNativeElements: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Require frontier components instead of native HTML elements' },
    messages: {
      outside: '`<{{name}}>` is raw HTML. Use a frontier component (fr-*); add one to frontier if none fits.',
      owned: '`<{{name}}>` belongs to {{owners}}. Compose that primitive instead of rendering the element.',
      unowned: '`<{{name}}>` has no frontier primitive yet. Add one (with cva variants) before using it.',
    },
    schema: [],
  },
  create(context) {
    const frontierPath = FRONTIER.exec(context.filename);
    const local =
      frontierPath === null ? undefined : context.filename.slice(frontierPath.index + frontierPath[0].length);
    return {
      Element(node: unknown): void {
        const { name, startSourceSpan } = node as ElementNode;
        if (typeof name !== 'string' || startSourceSpan === undefined) {
          return;
        }
        const loc = context.sourceCode.getLocFromIndex(startSourceSpan.start.offset);
        if (local === undefined) {
          if (!ALLOWED_OUTSIDE.test(name)) {
            context.report({ loc, messageId: 'outside', data: { name } });
          }
          return;
        }
        const owners = OWNERS.get(name);
        if (owners === undefined || owners.some((owner) => local.startsWith(owner))) {
          return;
        }
        context.report(
          owners.length === 0
            ? { loc, messageId: 'unowned', data: { name } }
            : {
                loc,
                messageId: 'owned',
                data: { name, owners: owners.map((owner) => `frontier/${owner}`).join(', ') },
              },
        );
      },
    };
  },
};
