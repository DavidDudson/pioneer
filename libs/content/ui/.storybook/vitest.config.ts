import { defineConfig } from 'vitest/config';

// oxlint-disable-next-line @nx/enforce-module-boundaries -- Vitest loads its config without tsconfig paths, so frontier's shared Storybook test setup is reached by path
import { storybookProject } from '../../../frontier/.storybook/storybook-project';

/** Content UI's stories as tests. Run with `nx test-storybook content-ui`. */
export default defineConfig({
  test: {
    projects: [storybookProject(import.meta.dirname)],
  },
});
