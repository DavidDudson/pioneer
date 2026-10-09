import path from 'node:path';

import type { StorybookConfig } from '@analogjs/storybook-angular';
import { mergeConfig } from 'vite';

/**
 * Frontier's Storybook: Vite through Analog's Angular framework, so it builds
 * with esbuild like the app does. Zoneless is detected from Angular's version.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.ts'],
  addons: [],
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
