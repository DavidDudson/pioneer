import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

/** Every Angular project's specs compile with the web app's development build, so they share its providers and polyfills. */
const BUILD_TARGET = 'web:build:development';

const SPEC_CONFIG = 'tsconfig.spec.json';

/** A test setup file a project keeps beside its sources: the Angular test builder loads it before the specs. */
const SETUP_FILE = 'src/test-setup.ts';

/** `test` for an Angular project with a spec tsconfig: the Angular unit-test builder on Vitest. `nx.json` `targetDefaults` give its caching. */
export function inferAngularTest({ root, isAngular, exists }: ProjectFacts): TargetConfiguration | undefined {
  const hasSpecConfig = isAngular && exists(SPEC_CONFIG);

  if (!hasSpecConfig) {
    return undefined;
  }

  const options = { buildTarget: BUILD_TARGET, tsConfig: `${root}/${SPEC_CONFIG}`, runner: 'vitest' };

  return {
    executor: '@angular/build:unit-test',
    options: exists(SETUP_FILE) ? { ...options, setupFiles: [`${root}/${SETUP_FILE}`] } : options,
  };
}
