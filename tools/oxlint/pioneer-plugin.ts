/**
 * Project rules oxlint and its plugins don't cover. Loaded as an oxlint JS
 * plugin (ESLint-compatible API).
 */
import type { Rule } from 'eslint';

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

const plugin = {
  meta: { name: 'pioneer' },
  rules: {
    'no-styles-outside-frontier': noStylesOutsideFrontier,
    'no-bypass-security-trust': noBypassSecurityTrust,
  },
};

export default plugin;
