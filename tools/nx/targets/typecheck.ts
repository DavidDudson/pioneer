import type { TargetConfiguration } from '@nx/devkit';

import type { ProjectFacts } from '../project-facts.ts';

/**
 * `typecheck`: `ngc` for Angular projects (template type-checking), `bun check` for everything else. Both read
 * tsconfig.json, which includes the specs, so a type error in a spec fails it.
 */
export function inferTypecheck({ root, angular }: ProjectFacts): TargetConfiguration {
  return {
    cache: true,
    // Dependencies are compiled from their sources only: their specs and stories cannot change this result.
    inputs: ['default', '^production'],
    command: angular ? `ngc -p ${root}/tsconfig.json --noEmit` : `bun check --no-script -p ${root}/tsconfig.json`,
  };
}
