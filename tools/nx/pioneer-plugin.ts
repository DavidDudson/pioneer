/**
 * Local Nx plugin: infers the targets every project gets, so project.json
 * files only declare what is genuinely project-specific (Angular builders,
 * the API's compile step).
 *
 * - `typecheck`: `ngc` for Angular projects (template type-checking),
 *   `tsc` for everything else.
 * - `lint-templates`: ESLint (angular-eslint) on Angular projects' templates.
 * - `test`: `bun test` for projects with `*.test.ts` files (Bun-run code).
 *   Angular projects use `*.spec.ts` with the Angular Vitest builder instead.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { createNodesFromFiles } from '@nx/devkit';
import type { CreateNodes, TargetConfiguration } from '@nx/devkit';

function hasMatchingFile(directory: string, matches: (file: string) => boolean): boolean {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.name !== 'node_modules' && !entry.name.startsWith('.'))
    .some((entry) => {
      const child = path.join(directory, entry.name);
      return entry.isDirectory() ? hasMatchingFile(child, matches) : matches(entry.name);
    });
}

function inferTargets(root: string, absoluteRoot: string): Record<string, TargetConfiguration> {
  const tsconfig = JSON.parse(readFileSync(path.join(absoluteRoot, 'tsconfig.json'), 'utf8')) as {
    readonly angularCompilerOptions?: unknown;
  };
  const angular = tsconfig.angularCompilerOptions !== undefined;
  const angularConfig = root.startsWith('apps') ? 'tsconfig.app.json' : 'tsconfig.json';
  const targets: Record<string, TargetConfiguration> = {
    typecheck: {
      cache: true,
      inputs: ['default', '^default'],
      command: angular ? `ngc -p ${root}/${angularConfig} --noEmit` : `tsc -p ${root}/tsconfig.json`,
    },
  };
  if (angular && hasMatchingFile(absoluteRoot, (file) => file.endsWith('.html'))) {
    targets['lint-templates'] = {
      cache: true,
      inputs: ['{projectRoot}/**/*.html', '{workspaceRoot}/eslint.config.ts', '{workspaceRoot}/tools/eslint/**/*'],
      command: `eslint --max-warnings=0 '${root}/**/*.html'`,
    };
  }
  if (hasMatchingFile(absoluteRoot, (file) => file.endsWith('.test.ts'))) {
    targets['test'] = { cache: true, inputs: ['default', '^production'], command: `bun test ${root}` };
  }
  return targets;
}

export const createNodes: CreateNodes = [
  '{apps,libs}/**/project.json',
  async (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);
        return { projects: { [root]: { targets: inferTargets(root, path.join(context.workspaceRoot, root)) } } };
      },
      configFiles,
      options,
      context,
    ),
];
