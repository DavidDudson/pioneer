/**
 * Project rules oxlint and its plugins don't cover. Loaded as an oxlint JS
 * plugin (ESLint-compatible API).
 */
import type { Rule } from 'eslint';

import { LAYOUT_PRIMITIVE, LAYOUT_VARIANT_MESSAGES, layoutVariantProblem } from '../layout-variants.ts';

const FRONTIER = /(?:^|\/)libs\/frontier\//u;
const STYLE_KEYS = new Set(['styles', 'styleUrl', 'styleUrls']);

interface DecoratorShape {
  readonly expression?: {
    readonly callee?: { readonly name?: unknown };
    readonly arguments?: readonly { readonly properties?: readonly { readonly key?: { readonly name?: unknown } }[] }[];
  };
}

/** Property names of the object literal passed to `@Component({...})`, if this is one. */
function componentKeys(node: unknown): readonly string[] {
  const { expression } = node as DecoratorShape;
  if (expression?.callee?.name !== 'Component') {
    return [];
  }
  return (expression.arguments?.[0]?.properties ?? []).flatMap((property) =>
    typeof property.key?.name === 'string' ? [property.key.name] : [],
  );
}

/** Only frontier may style. Everyone else composes frontier components. */
const noStylesOutsideFrontier: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow component styles outside libs/frontier' },
    messages: {
      styles: 'Components outside libs/frontier must not have styles ({{key}}). Use frontier components and tokens.',
    },
    schema: [],
  },
  create(context) {
    if (FRONTIER.test(context.filename)) {
      return {};
    }
    return {
      Decorator(node: Rule.Node): void {
        for (const key of componentKeys(node).filter((name) => STYLE_KEYS.has(name))) {
          context.report({ node, messageId: 'styles', data: { key } });
        }
      },
    };
  },
};

/** DomSanitizer bypasses turn XSS protection off; there is no safe use here. */
const noBypassSecurityTrust: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow DomSanitizer.bypassSecurityTrust*' },
    messages: { bypass: '{{name}} disables Angular XSS protection and is banned.' },
    schema: [],
  },
  create(context) {
    return {
      MemberExpression(node): void {
        if (node.property.type === 'Identifier' && node.property.name.startsWith('bypassSecurityTrust')) {
          context.report({ node, messageId: 'bypass', data: { name: node.property.name } });
        }
      },
    };
  },
};

const RELOADS = new Set(['reload', 'assign', 'replace']);

/** `location` or `<anything>.location`. */
function isLocation(node: unknown): boolean {
  const target = node as {
    readonly type?: unknown;
    readonly name?: unknown;
    readonly property?: { readonly name?: unknown };
  };
  return (
    (target.type === 'Identifier' && target.name === 'location') ||
    (target.type === 'MemberExpression' && target.property?.name === 'location')
  );
}

/** Never load a whole document: navigate with the router, load regions with skeletons. */
const noFullPageLoad: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow full page loads via location' },
    messages: { reload: 'Full page load via {{what}}. Use the Router and reload only the region that changed.' },
    schema: [],
  },
  create(context) {
    return {
      CallExpression(node): void {
        const { callee } = node;
        if (
          callee.type === 'MemberExpression' &&
          callee.property.type === 'Identifier' &&
          RELOADS.has(callee.property.name) &&
          isLocation(callee.object)
        ) {
          context.report({ node, messageId: 'reload', data: { what: `location.${callee.property.name}()` } });
        }
      },
      AssignmentExpression(node): void {
        const { left } = node;
        const isLocationPart = left.type === 'MemberExpression' && isLocation(left.object);
        if (isLocation(left) || isLocationPart) {
          context.report({ node, messageId: 'reload', data: { what: 'assigning location' } });
        }
      },
    };
  },
};

/** Resolvers hold the whole page blank until data arrives. Render the page, skeleton the data. */
const noRouteResolvers: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Disallow route resolvers' },
    messages: { resolve: 'Route resolvers block the page. Render immediately and show skeletons while data loads.' },
    schema: [],
  },
  create(context) {
    return {
      Property(node): void {
        if (node.key.type === 'Identifier' && node.key.name === 'resolve' && node.value.type === 'ObjectExpression') {
          context.report({ node, messageId: 'resolve' });
        }
      },
    };
  },
};

/** Responsive classes live only in frontier's layout primitives; see tools/layout-variants.ts. */
const layoutVariants: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Restrict responsive variants in libs/frontier to layout primitives' },
    messages: LAYOUT_VARIANT_MESSAGES,
    schema: [],
  },
  create(context) {
    if (!FRONTIER.test(context.filename)) {
      return {};
    }
    const inPrimitive = LAYOUT_PRIMITIVE.test(context.filename);
    const check = (node: Rule.Node, text: unknown): void => {
      const problem = typeof text === 'string' ? layoutVariantProblem(text, inPrimitive) : undefined;
      if (problem !== undefined) {
        context.report({ node, messageId: problem.messageId, data: { variant: problem.variant } });
      }
    };
    return {
      Literal(node): void {
        check(node, node.value);
      },
      TemplateElement(node): void {
        check(node, node.value.cooked);
      },
    };
  },
};

const plugin = {
  meta: { name: 'pioneer' },
  rules: {
    'no-styles-outside-frontier': noStylesOutsideFrontier,
    'no-bypass-security-trust': noBypassSecurityTrust,
    'no-full-page-load': noFullPageLoad,
    'no-route-resolvers': noRouteResolvers,
    'layout-variants': layoutVariants,
  },
};

export default plugin;
