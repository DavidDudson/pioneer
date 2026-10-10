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
 * Every story in the Storybook at `configDir` as a test in headless Chromium: its `play` function, then axe
 * (`a11y.test: 'error'` in the shared preview). One project per theme × colour mode, since contrast and focus
 * rings differ in each; `vitest.setup.ts` beside the config reads the pair through `inject`. Projects are named
 * `storybook:<theme>-<mode>` in every library, so one `--project` runs the same slice everywhere (CI's matrix).
 */
export function storybookThemeProjects(configDir: string): TestProjectInlineConfiguration[] {
  checkPlaywrightDriver();
  return Object.values(Theme).flatMap((theme) =>
    Object.values(ColorMode).map((mode) => ({
      plugins: [storybookTest({ configDir })],
      test: {
        name: `storybook:${theme}-${mode}`,
        provide: { theme, mode },
        setupFiles: [path.join(configDir, 'vitest.setup.ts')],
        browser: {
          enabled: true,
          headless: true,
          provider: playwright(),
          instances: [{ browser: 'chromium' }],
        },
      },
    })),
  );
}
