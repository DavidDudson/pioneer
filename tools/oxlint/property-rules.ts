/**
 * Caps fast-check `numRuns`: every run costs CI time on every pull request, so a slow property gets cheaper rather than
 * sharded. Best effort: a value the rule cannot resolve to a number in the same file (a run count read from the
 * environment, an imported constant) is allowed.
 * Registered by pioneer-plugin.ts.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

/** The fast-check default number of runs. */
const DEFAULT_MAX_PROPERTY_RUNS = 100;

const OPTIONS = z.object({ max: z.number().int().positive() });

const IDENTIFIER = z.object({ type: z.literal('Identifier'), name: z.string() });
const NUMBER_LITERAL = z.object({ type: z.literal('Literal'), value: z.number() });
const RUNS_KEY = z.object({ type: z.literal('Identifier'), name: z.literal('numRuns') });

/** An object property keyed `numRuns` whose value is a number or a name. Any other property fails to parse. */
export const RUNS_PROPERTY = z.object({ key: RUNS_KEY, value: z.union([NUMBER_LITERAL, IDENTIFIER]) });

/** A `const NAME = <number>` declarator. Any other declarator fails to parse. */
export const NUMBER_CONSTANT = z.object({ id: IDENTIFIER, init: NUMBER_LITERAL });

export type RunsProperty = z.infer<typeof RUNS_PROPERTY>;

/** The `numRuns` a property sets, or `undefined` for a name the rule cannot resolve to a number. */
export function propertyRuns(
  property: RunsProperty,
  constants: ReadonlyMap<string, number>,
  redeclared: ReadonlySet<string> = new Set(),
): number | undefined {
  const { value } = property;

  if (value.type === 'Literal') {
    return value.value;
  }

  return redeclared.has(value.name) ? undefined : constants.get(value.name);
}

export const maxPropertyRuns: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Cap fast-check numRuns so property tests stay cheap in CI' },
    messages: {
      tooMany: 'numRuns {{runs}} is over the cap of {{max}}. Make the property cheaper.',
    },
    schema: [{ type: 'object', additionalProperties: true }],
  },
  create(context) {
    const options = OPTIONS.safeParse(context.options[0]);
    const max = options.success ? options.data.max : DEFAULT_MAX_PROPERTY_RUNS;
    const constants = new Map<string, number>();
    const redeclared = new Set<string>();
    const properties: Array<{ readonly node: Rule.Node; readonly property: RunsProperty }> = [];

    return {
      VariableDeclarator(node): void {
        const constant = NUMBER_CONSTANT.safeParse(node);

        if (constant.success) {
          const { name } = constant.data.id;

          if (constants.has(name)) {
            redeclared.add(name);
          }

          constants.set(name, constant.data.init.value);
        }
      },
      Property(node): void {
        const property = RUNS_PROPERTY.safeParse(node);

        if (property.success) {
          properties.push({ node, property: property.data });
        }
      },
      'Program:exit'(): void {
        for (const { node, property } of properties) {
          const runs = propertyRuns(property, constants, redeclared);

          if (runs !== undefined && runs > max) {
            context.report({ node, messageId: 'tooMany', data: { runs: String(runs), max: String(max) } });
          }
        }
      },
    };
  },
};
