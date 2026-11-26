/**
 * No sharding by test name (#2243). A `bun test --test-name-pattern 'Bard|Cleric'` target splits slow tests across CI
 * jobs by class name instead of making them cheaper, and every shard repeats about a minute of setup. A shard that
 * exists today is on `NAME_PATTERN_SHARDS`; the list only shrinks. Run by `check-test-sharding.ts`.
 */
import * as z from 'zod';

/**
 * Targets that still shard by test name, as `<project.json>#<target>:<configuration>`. Remove an entry in the change
 * that merges its shard (#2243). An entry that no longer matches a target fails the check, so the list cannot rot.
 */
export const NAME_PATTERN_SHARDS: ReadonlySet<string> = new Set([
  'apps/api/project.json#test:generate-spells-1',
  'apps/api/project.json#test:generate-spells-2',
  'apps/api/project.json#test:generate-spells-3',
  'apps/api/project.json#test:generate-spells-4',
  'apps/api/project.json#test:generate-1',
  'apps/api/project.json#test:generate-2',
  'apps/api/project.json#test:generate-3',
  'apps/api/project.json#test:generate-4',
]);

const BUN_TEST_BY_NAME = /\bbun test\b.*(?:--test-name-pattern|\s-t\s)/u;

const COMMAND = z.object({ command: z.string().optional() });

const TARGET = COMMAND.extend({
  options: COMMAND.optional(),
  configurations: z.record(z.string(), COMMAND).optional(),
});

export const PROJECT = z.object({ targets: z.record(z.string(), TARGET).optional() });

/** Whether a shell command runs bun tests selected by test name. */
export function shardsByName(command: string): boolean {
  return BUN_TEST_BY_NAME.test(command);
}

/** A `project.json`, as far as the check reads it. */
export type Project = z.infer<typeof PROJECT>;

/** Every `<file>#<target>[:<configuration>]` in a `project.json` whose command shards by test name. */
export function nameShards(file: string, project: Project): readonly string[] {
  const found: string[] = [];

  for (const [name, target] of Object.entries(project.targets ?? {})) {
    const commands: [string, string | undefined][] = [
      [`${file}#${name}`, target.command],
      [`${file}#${name}`, target.options?.command],
      ...Object.entries(target.configurations ?? {}).map(
        ([configuration, { command }]): [string, string | undefined] => [`${file}#${name}:${configuration}`, command],
      ),
    ];

    for (const [id, command] of commands) {
      if (command !== undefined && shardsByName(command)) {
        found.push(id);
      }
    }
  }

  return found;
}

/** The problems with `found` shards against the allowlist: new shards, and allowlist entries with no shard. */
export function shardProblems(found: readonly string[], allowed: ReadonlySet<string> = NAME_PATTERN_SHARDS): string[] {
  const foundSet = new Set(found);

  return [
    ...found.flatMap((id) =>
      allowed.has(id) ? [] : [`${id}: shards tests by name. Make the tests cheaper instead (#2243).`],
    ),
    ...[...allowed].flatMap((id) =>
      foundSet.has(id) ? [] : [`${id}: no longer shards by name. Remove it from NAME_PATTERN_SHARDS.`],
    ),
  ];
}
