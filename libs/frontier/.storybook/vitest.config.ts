import path from 'node:path';

import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';
import type { TestProjectInlineConfiguration } from 'vitest/config';

import { ColorMode, Theme } from '../src/lib/theme/theme';

/**
 * Every story as a test in headless Chromium: its `play` function, then axe (`a11y.test: 'error'` in
 * preview.ts). One project per theme × colour mode, since contrast and focus rings differ in each; the setup
 * file reads the pair through `inject`. Run with `nx test-storybook frontier`.
 */
function themeProject(theme: Theme, mode: ColorMode): TestProjectInlineConfiguration {
  return {
    plugins: [storybookTest({ configDir: import.meta.dirname })],
    test: {
      name: `storybook:${theme}-${mode}`,
      provide: { theme, mode },
      setupFiles: [path.join(import.meta.dirname, 'vitest.setup.ts')],
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: 'chromium' }],
      },
    },
  };
}

export default defineConfig({
  test: {
    projects: Object.values(Theme).flatMap((theme) =>
      Object.values(ColorMode).map((mode) => themeProject(theme, mode)),
    ),
  },
});
