import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

/** `typecheck`: `ngc` for Angular projects (it checks templates), `bun check` for the rest; both include the specs. */
export function inferTypecheck({ root, isAngular }: ProjectFacts): TargetConfiguration {
  return {
    cache: true,
    // Dependencies are compiled from their sources only: their specs and stories cannot change this result.
    inputs: ['default', '^production'],
    command: isAngular ? `ngc -p ${root}/tsconfig.json --noEmit` : `bun check --no-script -p ${root}/tsconfig.json`,
  };
}
