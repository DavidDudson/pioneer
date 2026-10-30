/**
 * Typechecks the projects that own the staged files: `bun tools/staged-typecheck.ts <file>...`. The pre-commit hook
 * (prek.toml) runs it, so a type error in a spec or a tool fails the commit and not the pull request's CI. It checks
 * each owning project only, never what depends on it (that is `just check` and CI), so it stays quick; Nx caches the
 * result by input, so an unchanged project costs nothing.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

/** Whether `directory` (relative to the workspace root) holds a project.json. */
export type HasProject = (directory: string) => boolean;

const PROJECT_FILE = 'project.json';
/** Directories of scripts that are no Nx project: `bun run typecheck:tools` checks them. */
const SCRIPT_DIRECTORIES = ['tools/', 'libs/frontier/scripts/'];

/** Whether `file` is in a scripts directory, which `typecheck:tools` covers and no project owns. */
export function isScript(file: string): boolean {
  return SCRIPT_DIRECTORIES.some((directory) => file.startsWith(directory));
}

/** The directory of the project that owns `file`: the nearest one above it with a project.json; undefined outside any. */
export function projectRootOf(file: string, hasProject: HasProject): string | undefined {
  let directory = path.dirname(file);
  while (directory !== '.' && directory !== '/') {
    if (hasProject(directory)) {
      return directory;
    }
    directory = path.dirname(directory);
  }
  return hasProject('.') ? '.' : undefined;
}

/** The roots of the projects that own `files`, each once, in order. */
export function projectRootsOf(files: readonly string[], hasProject: HasProject): readonly string[] {
  const roots = files.flatMap((file) => projectRootOf(file, hasProject) ?? []);
  return [...new Set(roots)].toSorted();
}

function nameOf(root: string): string {
  const project = JSON.parse(readFileSync(path.join(root, PROJECT_FILE), 'utf8')) as { readonly name: string };
  return project.name;
}

async function main(files: readonly string[]): Promise<number> {
  const roots = projectRootsOf(files, (directory) => existsSync(path.join(directory, PROJECT_FILE)));
  const commands: (readonly string[])[] = [];
  if (roots.length > 0) {
    commands.push(['bunx', 'nx', 'run-many', '-t', 'typecheck', '-p', roots.map((root) => nameOf(root)).join(',')]);
  }
  if (files.some((file) => isScript(file))) {
    commands.push(['bun', 'run', 'typecheck:tools']);
  }
  const codes = await Promise.all(
    commands.map(async (command) => Bun.spawn([...command], { stdout: 'inherit', stderr: 'inherit' }).exited),
  );
  return codes.find((code) => code !== 0) ?? 0;
}

if (import.meta.main) {
  process.exitCode = await main(Bun.argv.slice(2));
}
