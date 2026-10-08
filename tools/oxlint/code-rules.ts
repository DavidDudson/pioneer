/**
 * Code-shape rules: how conditions, return types and types are written.
 * Registered by pioneer-plugin.ts.
 */
import type { Rule } from 'eslint';

const BRANCHES = new Set([
  'IfStatement',
  'WhileStatement',
  'DoWhileStatement',
  'ForStatement',
  'ConditionalExpression',
]);
const BOUNDARIES = new Set(['Program', 'FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

interface AncestorShape {
  readonly type: string;
  readonly parent?: AncestorShape;
  readonly test?: unknown;
  readonly returnType?: unknown;
}

/** Whether `parent` owns `child` in the slot a rule cares about (a condition, a return type). */
type OwnsSlot = (parent: AncestorShape, child: AncestorShape) => boolean;

/** Whether some ancestor of `node`, up to and including the enclosing function, owns it per `ownsSlot`. */
function hasOwner(node: unknown, ownsSlot: OwnsSlot): boolean {
  let child = node as AncestorShape;
  let { parent } = child;
  while (parent !== undefined) {
    if (ownsSlot(parent, child)) {
      return true;
    }
    if (BOUNDARIES.has(parent.type)) {
      return false;
    }
    child = parent;
    ({ parent } = child);
  }
  return false;
}

const inCondition: OwnsSlot = (parent, child) => BRANCHES.has(parent.type) && parent.test === child;
const inReturnType: OwnsSlot = (parent, child) => parent.returnType === child;

/** Name what you await, then branch on the name: `const fileExists = await file.exists(); if (!fileExists)`. */
export const noAwaitInCondition: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow await inside branch and loop conditions' },
    messages: { await: 'Await into a named const on its own line, then branch on that name.' },
    schema: [],
  },
  create(context) {
    return {
      AwaitExpression(node): void {
        if (hasOwner(node, inCondition)) {
          context.report({ node, messageId: 'await' });
        }
      },
    };
  },
};

/** Object shapes in a return type get a name (`interface`/`type`) instead of being spelled inline. */
export const noInlineReturnTypes: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow object type literals in return types' },
    messages: { inline: 'Name this shape with an interface or type alias and return that.' },
    schema: [],
  },
  create(context) {
    return {
      TSTypeLiteral(node: Rule.Node): void {
        if (hasOwner(node, inReturnType)) {
          context.report({ node, messageId: 'inline' });
        }
      },
    };
  },
};

const DERIVED_TYPES = new Set(['ReturnType', 'Parameters', 'InstanceType', 'ConstructorParameters']);

interface TypeReferenceShape {
  readonly typeName?: { readonly type?: unknown; readonly name?: unknown };
}

/** Types are declared, not reverse-engineered from an implementation. */
export const noDerivedTypes: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow ReturnType, Parameters, InstanceType and ConstructorParameters' },
    messages: {
      derived: '{{name}}<> derives a type from an implementation. Import the library type or declare one.',
    },
    schema: [],
  },
  create(context) {
    return {
      TSTypeReference(node: Rule.Node): void {
        const { typeName } = node as unknown as TypeReferenceShape;
        const name = typeName?.type === 'Identifier' ? typeName.name : undefined;
        if (typeof name === 'string' && DERIVED_TYPES.has(name)) {
          context.report({ node, messageId: 'derived', data: { name } });
        }
      },
    };
  },
};
