/** Reads `@Component({...})` decorators. Used by pioneer-plugin.ts. */
import type { Rule } from 'eslint';
import * as z from 'zod';

const ComponentCallee = z.looseObject({ name: z.literal('Component') });
const ObjectArgument = z.looseObject({ properties: z.array(z.unknown()) });
const ComponentArguments = z.tuple([ObjectArgument], z.unknown());
const ComponentExpression = z.looseObject({ callee: ComponentCallee, arguments: ComponentArguments });
const ComponentCall = z.looseObject({ expression: ComponentExpression });

const NamedProperty = z.looseObject({ key: z.looseObject({ name: z.string() }) });

/** Property names of the object literal passed to `@Component({...})`, if this node is one. */
export function componentKeys(decorator: Rule.Node): readonly string[] {
  const call = ComponentCall.safeParse(decorator);

  if (!call.success) {
    return [];
  }

  return call.data.expression.arguments[0].properties.flatMap((property) => {
    const named = NamedProperty.safeParse(property);

    return named.success ? [named.data.key.name] : [];
  });
}
