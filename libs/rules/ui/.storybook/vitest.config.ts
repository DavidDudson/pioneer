import { defineConfig } from 'vitest/config';

// oxlint-disable-next-line @nx/enforce-module-boundaries -- Vitest loads its config without tsconfig paths, so frontier's shared Storybook test setup is reached by path
import { storybookThemeProjects } from '../../../frontier/.storybook/theme-projects';

/** Rules UI's stories as tests, one project per theme × colour mode. Run with `nx test-storybook rules-ui`. */
export default defineConfig({
  test: {
    projects: storybookThemeProjects(import.meta.dirname),
  },
});
