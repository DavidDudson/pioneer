import path from 'node:path';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import playwrightPackage from 'playwright/package.json' with { type: 'json' };
import type { TestProjectInlineConfiguration } from 'vitest/config';

import { ColorMode, Theme } from '../src/lib/theme/theme';

/**
 * The devshell's browsers are built for nixpkgs' playwright-driver (flake.nix), and npm's playwright finds them
 * only when both are the same version. Say so here, not as a missing-executable error that suggests
 * `playwright install`.
 */
function checkPlaywrightDriver(): void {
  const driverVersion = process.env['PLAYWRIGHT_DRIVER_VERSION'];
  if (driverVersion !== undefined && driverVersion !== playwrightPackage.version) {
    throw new Error(
      `playwright ${playwrightPackage.version} in package.json does not match nixpkgs' playwright-driver ` +
        `${driverVersion}: pin playwright to ${driverVersion} (bun add -d --exact playwright@${driverVersion}).`,
    );
  }
}

/**
 * A story test's time limit. Vitest's 15 s default is enough for any story alone (the longest, forced colours, takes
 * under a second), but `nx affected` runs every library's project at once, and on a loaded machine the forced colours
 * story's screenshot then waits past it for the meter to settle. A slow story is not a failure.
 */
const STORY_TIMEOUT_MS = 60_000;

/**
 * The theme and colour mode every story is tested in. One is enough: a story's `play` function and markup do not
 * depend on the palette, and what does (token contrast, no dev-only styles) is checked for every theme and mode by
 * `check:contrast` and `verify-styles`. Running each story in all four combinations only multiplied the time and the
 * flakes.
 */
const TEST_THEME = Theme.Frontier;
const TEST_MODE = ColorMode.Dark;

/**
 * Every story in the Storybook at `configDir` as a test in headless Chromium: its `play` function, then axe
 * (`a11y.test: 'error'` in the shared preview), in `TEST_THEME` and `TEST_MODE`. `vitest.setup.ts` beside the config
 * reads the pair through `inject`. The project is named `storybook` in every library.
 */
export function storybookProject(configDir: string): TestProjectInlineConfiguration {
  checkPlaywrightDriver();
  return {
    plugins: [storybookTest({ configDir })],
    test: {
      name: 'storybook',
      provide: { theme: TEST_THEME, mode: TEST_MODE },
      setupFiles: [path.join(configDir, 'vitest.setup.ts')],
      testTimeout: STORY_TIMEOUT_MS,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
    },
  };
}
