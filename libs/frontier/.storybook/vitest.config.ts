import { defineConfig } from 'vitest/config';

import { storybookProject } from './storybook-project';

/** Frontier's stories as tests. Run with `nx test-storybook frontier`. */
export default defineConfig({
  test: {
    projects: [storybookProject(import.meta.dirname)],
  },
});
