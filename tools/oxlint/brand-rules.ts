/**
 * Rules for branded values (`CharacterId`, `Feet`, `Milliseconds`).
 * Registered by pioneer-plugin.ts.
 */
import type { Rule } from 'eslint';

interface NodeShape {
  readonly type: string;
  readonly parent?: NodeShape;
  readonly value?: unknown;
  readonly operator?: unknown;
  readonly init?: unknown;
  readonly right?: unknown;
  readonly left?: { readonly type?: unknown };
  readonly property?: unknown;
  readonly computed?: unknown;
  readonly kind?: unknown;
  readonly callee?: { readonly type?: unknown; readonly property?: { readonly name?: unknown } };
  readonly arguments?: readonly unknown[];
}

interface MagicNumberOptions {
  readonly ignore?: readonly number[];
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
function isBrandConstant(target: NodeShape): boolean {
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
function isStructural(target: NodeShape, parent: NodeShape): boolean {
  return (
    TYPE_PARENTS.has(parent.type) ||
    parent.type === 'Property' ||
    (parent.type === 'AssignmentExpression' && parent.right === target && isMember(parent.left))
  );
}

/** Whether `target` (the literal, or its negation) sits where a bare number is allowed by `options`. */
function isExempt(target: NodeShape, value: number, options: MagicNumberOptions): boolean {
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
function declarationKind(target: NodeShape): unknown {
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
    const options = (context.options[0] ?? {}) as MagicNumberOptions;
    return {
      Literal(node: Rule.Node): void {
        const literal = node as unknown as NodeShape;
        if (typeof literal.value !== 'number') {
          return;
        }
        const negated = literal.parent?.type === 'UnaryExpression' && literal.parent.operator === '-';
        const [target, value] = negated ? [literal.parent, -literal.value] : [literal, literal.value];
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

interface ChainShape {
  readonly type: string;
  readonly parent?: ChainShape;
  readonly object?: unknown;
  readonly callee?: unknown;
  readonly property?: { readonly name?: unknown };
}

/** Whether a primitive keyword is (part of) a declared type: a field, parameter, return or variable annotation. */
function isAnnotated(node: unknown): boolean {
  let { parent } = node as ChainShape;
  while (parent !== undefined && TYPE_WRAPPERS.has(parent.type)) {
    ({ parent } = parent);
  }
  return parent?.type === 'TSTypeAnnotation';
}

/** Method names called along `z.string().min(1).brand(...)` after the factory call. */
function chainMethods(call: unknown): readonly string[] {
  const names: string[] = [];
  let node = call as ChainShape;
  let member = node.parent;
  while (member?.type === 'MemberExpression' && member.object === node && member.parent?.callee === member) {
    if (typeof member.property?.name === 'string') {
      names.push(member.property.name);
    }
    node = member.parent;
    member = node.parent;
  }
  return names;
}

/** `z.string()` / `Pg.smallint()` etc.: the factory name, if this call is one. */
function primitiveSchema(node: Rule.Node): string | undefined {
  const { callee } = node as unknown as {
    readonly callee: ChainShape & { readonly object?: { readonly name?: unknown } };
  };
  const name = callee.property?.name;
  const root = callee.object?.name;
  const isPrimitive = typeof name === 'string' && PRIMITIVE_SCHEMAS.has(name);
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
