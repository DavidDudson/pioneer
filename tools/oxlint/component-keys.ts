/** Reads `@Component({...})` decorators. Used by pioneer-plugin.ts. */

interface DecoratorNode {
  readonly expression?: {
    readonly callee?: { readonly name?: unknown };
    readonly arguments?: readonly { readonly properties?: readonly { readonly key?: { readonly name?: unknown } }[] }[];
  };
}

/** Property names of the object literal passed to `@Component({...})`, if this is one. */
export function componentKeys(node: unknown): readonly string[] {
  // SAFETY: oxlint passes ESTree nodes, and this local shape lists only the fields read here, each optional or guarded before use.
  const { expression } = node as DecoratorNode;

  if (expression?.callee?.name !== 'Component') {
    return [];
  }

  return (expression.arguments?.[0]?.properties ?? []).flatMap((property) =>
    typeof property.key?.name === 'string' ? [property.key.name] : [],
  );
}
