/**
 * Bans `bun test --test-name-pattern` shards, which split slow tests across CI jobs by name instead of making them
 * cheaper.
 */
import * as z from 'zod';

/** Targets that still shard by test name, as `<project.json>#<target>:<configuration>`. The list only shrinks. */
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

const BUN_TEST_BY_NAME = /\bbun test\b.*(?:--test-name-pattern|\s-t)(?:[\s=]|$)/u;

const COMMAND = z.object({ command: z.string().optional() });

const TARGET = COMMAND.extend({
  options: COMMAND.optional(),
  configurations: z.record(z.string(), COMMAND).optional(),
});

export const PROJECT = z.object({ targets: z.record(z.string(), TARGET).optional() });

/** Whether a shell command runs bun tests selected by test name. */
export function isNameShardCommand(command: string): boolean {
  return BUN_TEST_BY_NAME.test(command);
}

/** A `project.json`, as far as the check reads it. */
type Project = z.infer<typeof PROJECT>;

interface TargetCommand {
  readonly id: string;
  readonly command: string | undefined;
}

/** Every `<file>#<target>[:<configuration>]` in a `project.json` whose command shards by test name. */
export function nameShards(file: string, project: Project): readonly string[] {
  return Object.entries(project.targets ?? {}).flatMap(([name, target]): readonly string[] => {
    const id = `${file}#${name}`;

    const configurations = Object.entries(target.configurations ?? {}).map(
      ([configuration, { command }]): TargetCommand => ({ id: `${id}:${configuration}`, command }),
    );

    const commands: readonly TargetCommand[] = [
      { id, command: target.command },
      { id, command: target.options?.command },
      ...configurations,
    ];

    return commands.flatMap(({ id: commandId, command }) =>
      command !== undefined && isNameShardCommand(command) ? [commandId] : [],
    );
  });
}

/** The problems with `found` shards against the allowlist: new shards, and allowlist entries with no shard. */
export function shardProblems(found: readonly string[], allowed: ReadonlySet<string> = NAME_PATTERN_SHARDS): string[] {
  const foundSet = new Set(found);

  return [
    ...found.flatMap((id) => (allowed.has(id) ? [] : [`${id}: shards tests by name. Make the tests cheaper instead.`])),
    ...[...allowed].flatMap((id) =>
      foundSet.has(id) ? [] : [`${id}: no longer shards by name. Remove it from NAME_PATTERN_SHARDS.`],
    ),
  ];
}
