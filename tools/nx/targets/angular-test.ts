import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

/** Every Angular project's specs compile with the web app's development build, so they share its providers and polyfills. */
const BUILD_TARGET = 'web:build:development';

/** A test setup file a project keeps beside its sources: the Angular test builder loads it before the specs. */
const SETUP_FILE = 'src/test-setup.ts';

/**
 * `test` for an Angular project with a `tsconfig.spec.json`: the Angular unit-test builder on Vitest. Caching and
 * inputs come from the `@angular/build:unit-test` entry in `nx.json` `targetDefaults`. A project adds its own
 * reporters and sharding `configurations` in `project.json`, which Nx merges over this.
 */
export function inferAngularTest({ root, angular, exists, hasFile }: ProjectFacts): TargetConfiguration | undefined {
  const hasSpecConfig = angular && hasFile((file) => file === 'tsconfig.spec.json');

  if (!hasSpecConfig) {
    return undefined;
  }

  const options = { buildTarget: BUILD_TARGET, tsConfig: `${root}/tsconfig.spec.json`, runner: 'vitest' };

  return {
    executor: '@angular/build:unit-test',
    options: exists(SETUP_FILE) ? { ...options, setupFiles: [`${root}/${SETUP_FILE}`] } : options,
  };
}
