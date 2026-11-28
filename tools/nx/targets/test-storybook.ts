import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

const VITEST_CONFIG = '.storybook/vitest.config.ts';

/** The helper every library's Storybook Vitest project is built with: a change to it reruns every library's stories. */
const SHARED_STORYBOOK_PROJECT = 'libs/frontier/.storybook/storybook-project.ts';

/**
 * `test-storybook`: a library's stories run as tests in a browser, from the Vitest config in its `.storybook` folder.
 * Browsers are not run in parallel, and a different Playwright browser or driver reruns the tests, so both are inputs.
 * Sharding `configurations` stay in `project.json`.
 */
export function inferTestStorybook({ root, exists }: ProjectFacts): TargetConfiguration | undefined {
  if (!exists(VITEST_CONFIG)) {
    return undefined;
  }

  // The helper sits inside Frontier, where the project's own files already cover it.
  const sharedInputs = SHARED_STORYBOOK_PROJECT.startsWith(`${root}/`)
    ? []
    : [`{workspaceRoot}/${SHARED_STORYBOOK_PROJECT}`];

  return {
    cache: true,
    parallelism: false,
    inputs: [
      'default',
      '^production',
      { env: 'PLAYWRIGHT_BROWSERS_PATH' },
      { env: 'PLAYWRIGHT_DRIVER_VERSION' },
      ...sharedInputs,
    ],
    command: `vitest run --config ${root}/${VITEST_CONFIG}`,
  };
}
