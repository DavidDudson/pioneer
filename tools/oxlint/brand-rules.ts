/**
 * Rules for branded values (`CharacterId`, `Feet`, `Milliseconds`).
 * Registered by pioneer-plugin.ts.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

const NUMBER = z.number();

interface UntypedNode {
  readonly type: string;
  readonly parent?: UntypedNode;
  readonly value?: unknown;
  readonly operator?: unknown;
  readonly init?: unknown;
  readonly right?: unknown;
  readonly left?: { readonly type?: unknown };
  readonly property?: unknown;
  readonly computed?: unknown;
  readonly kind?: string;
  readonly callee?: { readonly type?: unknown; readonly property?: { readonly name?: unknown } };
  readonly arguments?: ReadonlyArray<unknown>;
}

interface MagicNumberOptions {
  readonly ignore?: ReadonlyArray<number>;
  readonly ignoreArrayIndexes?: boolean;
  readonly ignoreDefaultValues?: boolean;
  readonly ignoreClassFieldInitialValues?: boolean;
  readonly enforceConst?: boolean;
}

function isMember(node: { readonly type?: unknown } | undefined): boolean {
  return node?.type === 'MemberExpression';
}

/** Type positions (`type Port = 8080`, enum members): numbers there are types, not magic. */
const TYPE_PARENTS = new Set(['TSLiteralType', 'TSEnumMember', 'TSIndexedAccessType']);

/** `const NAME = Brand.parse(<literal>)`: the const names the number, the brand carries its unit. */
function isBrandConstant(target: UntypedNode): boolean {
  const call = target.parent;
  const declarator = call?.parent;

  return (
    call?.type === 'CallExpression' &&
    call.callee?.type === 'MemberExpression' &&
    call.callee.property?.name === 'parse' &&
    call.arguments?.length === 1 &&
    declarator?.type === 'VariableDeclarator' &&
    declarator.init === call &&
    declarator.parent?.kind === 'const'
  );
}

/** Always allowed: type positions, and (ESLint's `detectObjects` default) object keys, values and `obj.x = 5`. */
function isStructural(target: UntypedNode, parent: UntypedNode): boolean {
  return (
    TYPE_PARENTS.has(parent.type) ||
    parent.type === 'Property' ||
    (parent.type === 'AssignmentExpression' && parent.right === target && isMember(parent.left))
  );
}

/** Whether `target` (the literal, or its negation) sits where a bare number is allowed by `options`. */
function isExempt(target: UntypedNode, value: number, options: MagicNumberOptions): boolean {
  const { parent } = target;

  if (parent === undefined) {
    return false;
  }

  const isIndex = parent.type === 'MemberExpression' && parent.computed === true && parent.property === target;

  return (
    (options.ignore ?? []).includes(value) ||
    isStructural(target, parent) ||
    (options.ignoreDefaultValues === true && parent.type === 'AssignmentPattern' && parent.right === target) ||
    (options.ignoreClassFieldInitialValues === true && parent.type === 'PropertyDefinition') ||
    (options.ignoreArrayIndexes === true && isIndex && Number.isInteger(value) && value >= 0) ||
    isBrandConstant(target)
  );
}

/** A literal assigned straight to a declaration: fine for `const`, a `useConst` problem otherwise. */
function declarationKind(target: UntypedNode): string | undefined {
  const { parent } = target;

  return parent?.type === 'VariableDeclarator' && parent.init === target ? parent.parent?.kind : undefined;
}

/**
 * ESLint's no-magic-numbers (the options this repo uses), plus brand constants:
 * `const REVERT_WINDOW = Milliseconds.parse(5000)` names the number as surely as
 * `const REVERT_WINDOW = 5000`, and also types it.
 */
export const noMagicNumbers: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow magic numbers; named consts and brand constants are fine' },
    messages: {
      noMagic: 'No magic number: {{raw}}. Name it with a const (branded if it has a unit).',
      useConst: 'Number constants are declared with const.',
    },
    schema: [{ type: 'object', additionalProperties: true }],
  },
  create(context) {
    // SAFETY: oxlint passes ESTree nodes, and this local shape lists only the fields read here, each optional or guarded before use.
    const options = (context.options[0] ?? {}) as MagicNumberOptions;

    return {
      Literal(node: Rule.Node): void {
        // SAFETY: oxlint passes ESTree nodes, and this local shape lists only the fields read here, each optional or guarded before use.
        const literal = node as UntypedNode;

        const number = NUMBER.safeParse(literal.value);

        if (!number.success) {
          return;
        }

        const negated = literal.parent?.type === 'UnaryExpression' && literal.parent.operator === '-';
        const [target, value] = negated ? [literal.parent, -number.data] : [literal, number.data];
        const kind = declarationKind(target);
        const allowed = kind === 'const' || (kind !== undefined && options.enforceConst !== true);

        if (allowed || isExempt(target, value, options)) {
          return;
        }

        const raw = String(value);
        context.report({ node, messageId: kind === undefined ? 'noMagic' : 'useConst', data: { raw } });
      },
    };
  },
};

/** Domain and rules code: where every value has a meaning a brand or const object can carry. */
const DOMAIN = /(?:^|\/)libs\/(?:[^/]+\/domain|rules\/(?:sdk|dice|formula|engine))\/src\/(?!testing\/)/u;
const TEST_FILE = /\.(?:test|spec)\.ts$/u;

/** Wrappers a primitive can sit in and still be the annotated type (`readonly string[]`, `number | undefined`). */
const TYPE_WRAPPERS = new Set(['TSUnionType', 'TSArrayType', 'TSTypeOperator']);

/** Schema factories that produce bare strings and numbers. */
const PRIMITIVE_SCHEMAS = new Set([
  'string',
  'number',
  'int',
  'int32',
  'smallint',
  'integer',
  'text',
  'varchar',
  'numeric',
  'real',
  'doublePrecision',
]);

const SCHEMA_ROOTS = new Set(['z', 'Pg']);

interface CallChainNode {
  readonly type: string;
  readonly parent?: CallChainNode | null;
  readonly object?: object;
  readonly callee?: object;
  readonly property?: { readonly type?: string; readonly name?: string };
}

/** Whether a primitive keyword is (part of) a declared type: a field, parameter, return or variable annotation. */
function isAnnotated(node: CallChainNode): boolean {
  let { parent } = node;

  while (parent !== undefined && parent !== null && TYPE_WRAPPERS.has(parent.type)) {
    ({ parent } = parent);
  }

  return parent?.type === 'TSTypeAnnotation';
}

/** Method names called along `z.string().min(1).brand(...)` after the factory call. */
function chainMethods(call: CallChainNode): ReadonlyArray<string> {
  const names: Array<string> = [];
  let node = call;
  let member = node.parent;

  while (member?.type === 'MemberExpression' && member.object === node) {
    const outer = member.parent;

    if (outer === undefined || outer === null || outer.callee !== member) {
      break;
    }

    if (member.property?.name !== undefined) {
      names.push(member.property.name);
    }

    node = outer;
    member = node.parent;
  }

  return names;
}

/** `z.string()` / `Pg.smallint()` etc.: the factory name, if this call is one. */
function primitiveSchema(node: Rule.Node): string | undefined {
  // SAFETY: oxlint passes ESTree nodes, and this local shape lists only the fields read here, each optional or guarded before use.
  const { callee } = node as {
    readonly callee: CallChainNode & { readonly object?: { readonly name?: string } };
  };

  const name = callee.property?.name;
  const root = callee.object?.name;
  const isPrimitive = name !== undefined && PRIMITIVE_SCHEMAS.has(name);

  return callee.type === 'MemberExpression' && isPrimitive && SCHEMA_ROOTS.has(String(root)) ? name : undefined;
}

/**
 * In domain and rules code a bare `string` or `number` is a value whose meaning
 * lives only in its name. Brand it (`CharacterName`, `Feet`) or use a const
 * object (`Attribute`), so the type says what it is.
 */
export const noPrimitiveDomainTypes: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Disallow bare string and number types and schemas in domain code' },
    messages: {
      type: 'Bare `{{keyword}}` in domain code. Use a brand (`.brand<...>()`) or a const object.',
      schema: '`{{factory}}()` without `.brand()` in domain code. Brand it or use `z.enum(ConstObject)`.',
    },
    schema: [],
  },
  create(context) {
    if (!DOMAIN.test(context.filename) || TEST_FILE.test(context.filename)) {
      return {};
    }

    const checkKeyword = (node: Rule.Node, keyword: string): void => {
      if (isAnnotated(node)) {
        context.report({ node, messageId: 'type', data: { keyword } });
      }
    };

    return {
      TSStringKeyword(node: Rule.Node): void {
        checkKeyword(node, 'string');
      },
      TSNumberKeyword(node: Rule.Node): void {
        checkKeyword(node, 'number');
      },
      CallExpression(node): void {
        const factory = primitiveSchema(node);

        if (factory !== undefined && !chainMethods(node).includes('brand')) {
          context.report({ node, messageId: 'schema', data: { factory } });
        }
      },
    };
  },
};
