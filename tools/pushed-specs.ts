/**
 * Runs the specs a push changes: `bun tools/pushed-specs.ts <file>...`. The pre-push hook (prek.toml) runs it, so a
 * spec that fails at runtime fails the push and not the pull request's CI. Typecheck cannot see that: a spec can
 * compile and still be wrong. Only the specs in the push run, never what they cover; `*.db.test.ts` needs Postgres
 * and is left to CI. An Angular project's specs run through its Nx `test` target, `*.test.ts` through `bun test`.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';

import { nameOf, projectRootOf } from './staged-typecheck.ts';
import type { HasProject } from './staged-typecheck.ts';

const isSpec = (file: string): boolean => file.endsWith('.spec.ts');
const isBunTest = (file: string): boolean => file.endsWith('.test.ts') && !file.endsWith('.db.test.ts');

/** What a push runs: Angular specs by owning project, and the files `bun test` runs. */
export interface SpecRuns {
  /** Project root to the file names of its changed specs. */
  readonly angular: ReadonlyMap<string, readonly string[]>;
  readonly bun: readonly string[];
}

/** The specs among `files` that exist (`exists`), split by how they run. */
export function specRunsOf(
  files: readonly string[],
  hasProject: HasProject,
  exists: (file: string) => boolean,
): SpecRuns {
  const present = files.filter((file) => exists(file));
  const angular = new Map<string, string[]>();
  for (const file of present.filter((each) => isSpec(each))) {
    const root = projectRootOf(file, hasProject);
    if (root !== undefined) {
      angular.set(root, [...(angular.get(root) ?? []), path.basename(file)]);
    }
  }
  return { angular, bun: present.filter((file) => isBunTest(file)) };
}

/** The commands that run `runs`, in order; `projectName` is the Nx name of a project root. */
export function commandsOf(runs: SpecRuns, projectName: (root: string) => string): readonly (readonly string[])[] {
  const commands: (readonly string[])[] = runs.bun.length > 0 ? [['bun', 'test', ...runs.bun]] : [];
  for (const [root, names] of runs.angular) {
    const includes = names.map((name) => `--include=**/${name}`);
    commands.push(['bunx', 'nx', 'run', `${projectName(root)}:test`, '--skip-nx-cache', ...includes]);
  }
  return commands;
}

async function run(command: readonly string[]): Promise<number> {
  return Bun.spawn([...command], { stdout: 'inherit', stderr: 'inherit' }).exited;
}

/** Runs `commands` one at a time, stopping at the first that fails; its exit code, or 0. */
async function runAll(commands: readonly (readonly string[])[]): Promise<number> {
  const [next, ...rest] = commands;
  if (next === undefined) {
    return 0;
  }
  const code = await run(next);
  return code === 0 ? runAll(rest) : code;
}

async function main(files: readonly string[]): Promise<number> {
  const runs = specRunsOf(
    files,
    (directory) => existsSync(path.join(directory, 'project.json')),
    (file) => existsSync(file),
  );
  // One at a time: each Angular run builds the app and loads the machine.
  return runAll(commandsOf(runs, nameOf));
}

if (import.meta.main) {
  process.exitCode = await main(Bun.argv.slice(2));
}
