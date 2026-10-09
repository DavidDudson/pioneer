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
 * Any other element must be in the map: one frontier has never classified
 * fails, so a new semantic element gets an owner before it ships.
 */
import type { Rule } from 'eslint';

const FRONTIER = /(?:^|\/)libs\/frontier\/src\/lib\//u;
const ALLOWED_OUTSIDE = /^(?:fr-|pio-)|^(?:ng-container|ng-template|ng-content|router-outlet)$/u;
/** Angular names foreign elements `:svg:svg`, `:svg:path`: the outermost is classified by its namespace, its subtree comes with it. */
const NAMESPACED = /^:(?<namespace>[a-z]+):/u;
/** Free inside frontier: its own components, Angular's structural elements, and elements with no semantics of their own. */
const STRUCTURAL =
  /^fr-|^(?:ng-container|ng-template|ng-content|div|span|header|footer|nav|main|section|article|aside)$/u;

/**
 * Native element → the frontier directories allowed to render it. Empty:
 * nobody yet (add a primitive first). Covers every element in the HTML
 * content model that carries semantics or behaviour.
 */
const OWNERS: ReadonlyMap<string, readonly string[]> = new Map([
  // Sections and headings
  ['h1', ['text/heading/']],
  ['h2', ['text/heading/']],
  ['h3', ['text/heading/']],
  ['h4', ['text/heading/']],
  ['h5', []],
  ['h6', []],
  ['hgroup', []],
  ['address', []],
  ['search', []],
  // Grouping
  ['p', ['text/text/']],
  ['hr', ['layout/divider/']],
  ['pre', []],
  ['blockquote', ['text/quote/']],
  ['ul', ['list/list/']],
  ['ol', ['list/list/']],
  ['menu', []],
  ['li', ['list/list-item/']],
  ['dl', ['list/description-list/']],
  ['dt', ['list/description-item/']],
  ['dd', ['list/description-item/']],
  ['figure', []],
  ['figcaption', []],
  // Text-level
  ['a', ['actions/link/']],
  ['em', []],
  ['strong', []],
  ['small', []],
  ['s', []],
  ['cite', []],
  ['q', ['text/text/']],
  ['dfn', []],
  ['abbr', ['text/text/']],
  ['ruby', []],
  ['rt', []],
  ['rp', []],
  ['data', []],
  ['time', ['date/']],
  ['code', ['text/text/']],
  ['var', []],
  ['samp', []],
  ['kbd', ['text/text/']],
  ['sub', []],
  ['sup', []],
  ['i', []],
  ['b', []],
  ['u', []],
  ['mark', []],
  ['bdi', []],
  ['bdo', []],
  ['br', []],
  ['wbr', []],
  ['ins', []],
  ['del', []],
  // Embedded
  ['picture', []],
  ['source', []],
  ['img', ['media/image/']],
  ['iframe', []],
  ['embed', []],
  ['object', []],
  ['video', []],
  ['audio', []],
  ['track', []],
  ['map', []],
  ['area', []],
  ['svg', ['icon/']],
  ['math', []],
  ['canvas', []],
  ['tanstack-chart', ['data/chart/']],
  // Tables
  ['table', ['data/table/']],
  ['caption', ['data/table/']],
  ['colgroup', ['data/table/']],
  ['col', ['data/table/']],
  ['thead', ['data/table/']],
  ['tbody', ['data/table/']],
  ['tfoot', ['data/table/']],
  ['tr', ['data/table/']],
  ['th', ['data/table/']],
  ['td', ['data/table/']],
  // Forms
  ['form', ['forms/form/', 'forms/async-form/']],
  ['label', ['forms/field/label/']],
  ['input', ['controls/text-input/', 'controls/number-input/', 'controls/date-input/', 'controls/search-input/']],
  ['button', ['actions/button/', 'controls/select/']],
  ['textarea', ['controls/text-area/']],
  ['datalist', []],
  ['optgroup', []],
  ['option', []],
  ['output', []],
  ['progress', []],
  ['meter', []],
  ['fieldset', []],
  ['legend', []],
  // Interactive
  ['details', ['layout/disclosure/']],
  ['summary', ['layout/disclosure/']],
]);

/** Elements no primitive may ever render → why, and what to use instead. */
const BANNED: ReadonlyMap<string, string> = new Map([
  ['select', '`fr-select` builds on @angular/aria, so a native select never gets an owner'],
  ['template', 'Angular templates use `ng-template`'],
  ['slot', 'Angular projects content with `ng-content`'],
  ['dialog', 'modals are banned (AGENTS.md interaction rules); show the content inline or route to it'],
  ['noscript', 'Angular templates only render with JavaScript running'],
]);

interface ElementNode {
  readonly name?: unknown;
  readonly startSourceSpan?: { readonly start: { readonly offset: number } };
}

interface Violation {
  readonly messageId: 'outside' | 'app' | 'owned' | 'unowned' | 'banned' | 'unknown';
  readonly data: Readonly<Record<string, string>>;
}

/** Why `name` may not be rendered in a frontier file at `local` (its path under src/lib/), or undefined if it may. */
function frontierViolation(name: string, local: string): Violation | undefined {
  if (STRUCTURAL.test(name)) {
    return undefined;
  }
  const reason = BANNED.get(name);
  if (reason !== undefined) {
    return { messageId: 'banned', data: { name, reason } };
  }
  const owners = OWNERS.get(name);
  if (owners === undefined) {
    return { messageId: 'unknown', data: { name } };
  }
  if (owners.some((owner) => local.startsWith(owner))) {
    return undefined;
  }
  return owners.length === 0
    ? { messageId: 'unowned', data: { name } }
    : { messageId: 'owned', data: { name, owners: owners.map((owner) => `frontier/${owner}`).join(', ') } };
}

/** Why `name` may not be rendered in the file at `local` (undefined: outside frontier), or undefined if it may. */
function violation(name: string, local: string | undefined): Violation | undefined {
  if (local === undefined) {
    return ALLOWED_OUTSIDE.test(name) ? undefined : { messageId: 'outside', data: { name } };
  }
  if (!STRUCTURAL.test(name) && ALLOWED_OUTSIDE.test(name)) {
    return { messageId: 'app', data: { name } };
  }
  return frontierViolation(name, local);
}

export const noNativeElements: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Require frontier components instead of native HTML elements' },
    messages: {
      outside: '`<{{name}}>` is raw HTML. Use a frontier component (fr-*); add one to frontier if none fits.',
      owned: '`<{{name}}>` belongs to {{owners}}. Compose that primitive instead of rendering the element.',
      unowned: '`<{{name}}>` has no frontier primitive yet. Add one (with cva variants) before using it.',
      app: '`<{{name}}>` is app-level. frontier never depends on app components or routing.',
      banned: '`<{{name}}>` is banned: {{reason}}.',
      unknown:
        '`<{{name}}>` is not in the ownership map. Add it to tools/eslint/no-native-elements.ts with its owning primitive.',
    },
    schema: [],
  },
  create(context) {
    const frontierPath = FRONTIER.exec(context.filename);
    const local =
      frontierPath === null ? undefined : context.filename.slice(frontierPath.index + frontierPath[0].length);
    // Foreign elements currently open: inside one, the outermost has already been classified.
    let foreignDepth = 0;
    return {
      Element(node: unknown): void {
        const { name: rawName, startSourceSpan } = node as ElementNode;
        if (typeof rawName !== 'string' || startSourceSpan === undefined) {
          return;
        }
        const namespace = NAMESPACED.exec(rawName)?.groups?.['namespace'];
        const nested = namespace !== undefined && foreignDepth > 0;
        foreignDepth += namespace === undefined ? 0 : 1;
        const found = nested ? undefined : violation(namespace ?? rawName, local);
        if (found !== undefined) {
          context.report({ loc: context.sourceCode.getLocFromIndex(startSourceSpan.start.offset), ...found });
        }
      },
      'Element:exit'(node: unknown): void {
        const { name: rawName } = node as ElementNode;
        foreignDepth -= typeof rawName === 'string' && NAMESPACED.test(rawName) ? 1 : 0;
      },
    };
  },
};
