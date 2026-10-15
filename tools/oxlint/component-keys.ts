/** Reads `@Component({...})` decorators. Used by pioneer-plugin.ts. */

interface DecoratorShape {
  readonly expression?: {
    readonly callee?: { readonly name?: unknown };
    readonly arguments?: readonly { readonly properties?: readonly { readonly key?: { readonly name?: unknown } }[] }[];
  };
}

/** Property names of the object literal passed to `@Component({...})`, if this is one. */
export function componentKeys(node: unknown): readonly string[] {
  const { expression } = node as DecoratorShape;
  if (expression?.callee?.name !== 'Component') {
    return [];
  }
  return (expression.arguments?.[0]?.properties ?? []).flatMap((property) =>
    typeof property.key?.name === 'string' ? [property.key.name] : [],
  );
}
