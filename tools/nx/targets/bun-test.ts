import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

/**
 * `test`: `bun test` for a project with `*.test.ts` files (Bun-run code). Angular projects use `*.spec.ts` with the
 * Angular Vitest builder instead.
 */
export function inferBunTest({ root, hasFile }: ProjectFacts): TargetConfiguration | undefined {
  const hasTests = hasFile((file) => file.endsWith('.test.ts'));

  return hasTests ? { cache: true, inputs: ['default', '^production'], command: `bun test ${root}` } : undefined;
}
