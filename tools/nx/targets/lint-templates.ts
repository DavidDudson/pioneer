import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

/** `lint-templates`: ESLint (angular-eslint) on an Angular project's templates, when it has any. */
export function inferLintTemplates({ root, isAngular, hasFile }: ProjectFacts): TargetConfiguration | undefined {
  const hasTemplates = isAngular && hasFile((file) => file.endsWith('.html'));

  if (!hasTemplates) {
    return undefined;
  }

  return {
    cache: true,
    // The sharedGlobals input carries bun.lock, so an ESLint or angular-eslint bump reruns it.
    inputs: [
      '{projectRoot}/**/*.html',
      '{workspaceRoot}/eslint.config.ts',
      '{workspaceRoot}/tools/eslint/**/*',
      'sharedGlobals',
    ],
    command: `eslint --max-warnings=0 '${root}/**/*.html'`,
  };
}
