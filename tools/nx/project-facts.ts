/** What the target inferrers ask about a project, read once from its folder. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import * as z from 'zod';

export interface ProjectFacts {
  /** The project's folder, relative to the workspace root. */
  readonly root: string;
  /** Whether the project's `tsconfig.json` sets `angularCompilerOptions`: an Angular project, checked with `ngc`. */
  readonly isAngular: boolean;
  /** Whether a file exists at this path, relative to the project's folder. */
  readonly exists: (file: string) => boolean;
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

/** The only tsconfig field the inferrers read: whether `angularCompilerOptions` is set. */
const TsconfigSchema = z.object({ angularCompilerOptions: z.json().optional() });

export function readProjectFacts(root: string, workspaceRoot: string): ProjectFacts {
  const absoluteRoot = path.join(workspaceRoot, root);
  const text = readFileSync(path.join(absoluteRoot, 'tsconfig.json'), 'utf8');
  const tsconfig = TsconfigSchema.parse(JSON.parse(text));

  return {
    root,
    isAngular: tsconfig.angularCompilerOptions !== undefined,
    exists: (file) => existsSync(path.join(absoluteRoot, file)),
    hasFile: (matches) => hasMatchingFile(absoluteRoot, matches),
  };
}
