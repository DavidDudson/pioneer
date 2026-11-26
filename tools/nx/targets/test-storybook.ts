import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

const VITEST_CONFIG = '.storybook/vitest.config.ts';

/** The helper every library's Storybook Vitest project is built with: a change to it reruns every library's stories. */
const SHARED_STORYBOOK_PROJECT = 'libs/frontier/.storybook/storybook-project.ts';

/** `test-storybook`: a library's stories as browser tests, from the Vitest config in its `.storybook` folder. */
export function inferTestStorybook({ root, exists }: ProjectFacts): TargetConfiguration | undefined {
  if (!exists(VITEST_CONFIG)) {
    return undefined;
  }

  // Frontier owns the helper, so its own files already cover it.
  const sharedInputs = SHARED_STORYBOOK_PROJECT.startsWith(`${root}/`)
    ? []
    : [`{workspaceRoot}/${SHARED_STORYBOOK_PROJECT}`];

  return {
    cache: true,
    parallelism: false,
    inputs: [
      'default',
      '^production',
      // A different Playwright browser or driver reruns the tests.
      { env: 'PLAYWRIGHT_BROWSERS_PATH' },
      { env: 'PLAYWRIGHT_DRIVER_VERSION' },
      ...sharedInputs,
    ],
    command: `vitest run --config ${root}/${VITEST_CONFIG}`,
  };
}
