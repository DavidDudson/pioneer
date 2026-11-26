/**
 * Property tests stay cheap (#2243). Registered by pioneer-plugin.ts.
 *
 * Every fast-check run costs CI time on every pull request, and a generation run builds a whole level 1-20 character
 * (about 6.6 s each). Slow tests were being cut into ever more shards instead of being made cheaper, so `numRuns` has a
 * cap. The full sweep belongs in the scheduled job, which reads its run count from the environment: a value the rule
 * cannot resolve to a number is allowed.
 */
import type { Rule } from 'eslint';
import * as z from 'zod';

/** The fast-check default. `.oxlintrc.json` lowers it for the expensive generation tests under `apps/api`. */
export const DEFAULT_MAX_PROPERTY_RUNS = 100;

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
export function propertyRuns(property: RunsProperty, constants: ReadonlyMap<string, number>): number | undefined {
  const { value } = property;

  return value.type === 'Literal' ? value.value : constants.get(value.name);
}

export const maxPropertyRuns: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: { description: 'Cap fast-check numRuns so property tests stay cheap in CI' },
    messages: {
      tooMany:
        'numRuns {{runs}} is over the cap of {{max}}. Make the property cheaper; the full sweep is a nightly job (#2243).',
    },
    schema: [{ type: 'object', additionalProperties: true }],
  },
  create(context) {
    const options = OPTIONS.safeParse(context.options[0]);
    const max = options.success ? options.data.max : DEFAULT_MAX_PROPERTY_RUNS;
    const constants = new Map<string, number>();
    const properties: { readonly node: Rule.Node; readonly property: RunsProperty }[] = [];

    return {
      VariableDeclarator(node): void {
        const constant = NUMBER_CONSTANT.safeParse(node);

        if (constant.success) {
          constants.set(constant.data.id.name, constant.data.init.value);
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
          const runs = propertyRuns(property, constants);

          if (runs !== undefined && runs > max) {
            context.report({ node, messageId: 'tooMany', data: { runs: String(runs), max: String(max) } });
          }
        }
      },
    };
  },
};
