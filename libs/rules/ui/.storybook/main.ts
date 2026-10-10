import path from 'node:path';

import type { StorybookConfig } from '@analogjs/storybook-angular';
import { mergeConfig } from 'vite';

/**
 * Rules UI's Storybook: the presentational components that render rules data (ADR-0028). Vite through
 * Analog's Angular framework, like frontier's. Zoneless is detected from Angular's version.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],
  framework: {
    name: '@analogjs/storybook-angular',
    options: {
      tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    },
  },
  core: {
    disableTelemetry: true,
  },
  // Resolve the workspace's `@pioneer/*` aliases from tsconfig.base.json.
  viteFinal: (viteConfig) => mergeConfig(viteConfig, { resolve: { tsconfigPaths: true } }),
};

export default config;
