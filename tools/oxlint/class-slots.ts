const CLASS_BUILDERS = new Set(['cva', 'cx']);

/** A node and the ancestors, as far as `holdsClasses` reads them. */
export interface AstNode {
  readonly type: string;
  readonly parent?: AstNode | null;
  readonly name?: string;
  readonly callee?: AstNode;
  readonly key?: AstNode;
  readonly expression?: AstNode | boolean;
  readonly arguments?: ReadonlyArray<AstNode>;
}

function isBuilderArgument(parent: AstNode, child: AstNode): boolean {
  return (
    parent.type === 'CallExpression' &&
    parent.callee?.type === 'Identifier' &&
    parent.callee.name !== undefined &&
    CLASS_BUILDERS.has(parent.callee.name) &&
    parent.arguments?.includes(child) === true
  );
}

function isClassProperty(parent: AstNode): boolean {
  return parent.type === 'Property' && parent.key?.type === 'Identifier' && parent.key.name === 'class';
}

function isSatisfiedObject(parent: AstNode, child: AstNode): boolean {
  return parent.type === 'TSSatisfiesExpression' && parent.expression === child && child.type === 'ObjectExpression';
}

/**
 * Whether a string at `child` is a class name: inside the arguments of `cva()` / `cx()`, the value of a `class`
 * property, or a `{…} satisfies` object. Object keys are variant names, not classes.
 */
export function holdsClasses(child: AstNode): boolean {
  let current = child;
  let { parent } = current;

  while (parent !== undefined && parent !== null) {
    const isClassSlot =
      isBuilderArgument(parent, current) || isClassProperty(parent) || isSatisfiedObject(parent, current);

    if (parent.key === current) {
      return false;
    }

    if (isClassSlot) {
      return true;
    }

    current = parent;
    ({ parent } = current);
  }

  return false;
}
