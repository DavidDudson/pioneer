import path from 'node:path';

import type { StorybookConfig } from '@analogjs/storybook-angular';

/**
 * Pioneer's Storybook: an introduction page, then each library's own Storybook composed in (ADR-0028). Frontier's
 * design system and every `ui` library that renders rules data keep their own Storybook, port and tests; this shows
 * them side by side. `nx storybook storybook` starts them all. A static build copies each library's build in beside
 * the manager.
 */
interface ComposedStorybook {
  readonly project: string;
  readonly title: string;
  /** The library's root, relative to the workspace. */
  readonly root: string;
  /** The library's `storybook` port, set in its project.json. */
  readonly port: number;
}

const COMPOSED: readonly ComposedStorybook[] = [
  { project: 'frontier', title: 'Frontier', root: 'libs/frontier', port: 6007 },
  { project: 'rules-ui', title: 'Rules UI', root: 'libs/rules/ui', port: 6008 },
];

const WORKSPACE_ROOT = path.join(import.meta.dirname, '../../..');

const config: StorybookConfig = {
  stories: ['../src/*.mdx'],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@analogjs/storybook-angular',
    options: {
      tsconfig: path.join(import.meta.dirname, 'tsconfig.json'),
    },
  },
  core: {
    disableTelemetry: true,
  },
  refs: (_refs, { configType }) =>
    Object.fromEntries(
      COMPOSED.map(({ project, title, port }) => [
        project,
        { title, url: configType === 'DEVELOPMENT' ? `http://localhost:${port}` : `./${project}` },
      ]),
    ),
  // `nx build-storybook <project>` writes each library's build to `<root>/storybook-static`.
  staticDirs: (_dirs, { configType }) =>
    configType === 'DEVELOPMENT'
      ? []
      : COMPOSED.map(({ project, root }) => ({
          from: path.join(WORKSPACE_ROOT, root, 'storybook-static'),
          to: `/${project}`,
        })),
};

export default config;
