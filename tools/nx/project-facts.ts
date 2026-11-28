/** What the inferrers of `pioneer-plugin.ts` ask about a project. Read once per project, from its folder. */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

export interface ProjectFacts {
  /** The project's folder, relative to the workspace root. */
  readonly root: string;
  /** Whether the project's `tsconfig.json` sets `angularCompilerOptions`: an Angular project, checked with `ngc`. */
  readonly angular: boolean;
  /** Whether a file anywhere under the project (not in `node_modules` or a dot folder) has a name that passes. */
  readonly hasFile: (matches: (file: string) => boolean) => boolean;
}

function hasMatchingFile(directory: string, matches: (file: string) => boolean): boolean {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .some((entry) => {
      const child = path.join(directory, entry.name);

      return entry.isDirectory() ? hasMatchingFile(child, matches) : matches(entry.name);
    });
}

/** The tsconfig fields the inferrers read: only whether `angularCompilerOptions` is set. */
interface TsconfigFields {
  readonly angularCompilerOptions?: object;
}

export function readProjectFacts(root: string, workspaceRoot: string): ProjectFacts {
  const absoluteRoot = path.join(workspaceRoot, root);
  // SAFETY: a project's `tsconfig.json` is a JSON object, and only whether it has `angularCompilerOptions` is read, an optional field.
  const tsconfig = JSON.parse(readFileSync(path.join(absoluteRoot, 'tsconfig.json'), 'utf8')) as TsconfigFields;

  return {
    root,
    angular: tsconfig.angularCompilerOptions !== undefined,
    hasFile: (matches) => hasMatchingFile(absoluteRoot, matches),
  };
}
