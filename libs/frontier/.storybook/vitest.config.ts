import { defineConfig } from 'vitest/config';

import { storybookThemeProjects } from './theme-projects';

/** Frontier's stories as tests, one project per theme × colour mode. Run with `nx test-storybook frontier`. */
export default defineConfig({
  test: {
    projects: storybookThemeProjects(import.meta.dirname),
  },
});
