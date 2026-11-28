/**
 * Local Nx plugin: infers the targets every project gets, so project.json files only declare what is genuinely
 * project-specific (Angular builders, the API's compile step). One module per target under `./targets/`; each
 * answers from a project's `ProjectFacts` and returns `undefined` when the project has nothing for it to run on.
 */
import path from 'node:path';

import { createNodesFromFiles } from '@nx/devkit';
import type { CreateNodes, TargetConfiguration } from '@nx/devkit';

import { readProjectFacts } from './project-facts.ts';
import type { ProjectFacts } from './project-facts.ts';
import { inferAngularTest } from './targets/angular-test.ts';
import { inferBunTest } from './targets/bun-test.ts';
import { inferLintTemplates } from './targets/lint-templates.ts';
import { inferTestStorybook } from './targets/test-storybook.ts';
import { inferTypecheck } from './targets/typecheck.ts';

/** Decides one target for a project: its configuration, or `undefined` for a project it does not apply to. */
type TargetInferrer = (facts: ProjectFacts) => TargetConfiguration | undefined;

/** Inferred target name to the module that decides it. */
const INFERRERS = {
  typecheck: inferTypecheck,
  'test-storybook': inferTestStorybook,
  'lint-templates': inferLintTemplates,
  test: (facts: ProjectFacts): TargetConfiguration | undefined => inferAngularTest(facts) ?? inferBunTest(facts),
} satisfies Record<string, TargetInferrer>;

/** Every target the project gets from the inferrers; a target no inferrer applies to is left out. */
export function inferTargets(facts: ProjectFacts): Record<string, TargetConfiguration> {
  const inferred = Object.entries(INFERRERS).map(([name, infer]): [string, TargetConfiguration | undefined] => [
    name,
    infer(facts),
  ]);

  const applicable = inferred.filter((entry): entry is [string, TargetConfiguration] => entry[1] !== undefined);

  return Object.fromEntries(applicable);
}

export const createNodes: CreateNodes = [
  '{apps,libs}/**/project.json',
  async (configFiles, options, context) =>
    createNodesFromFiles(
      (configFile) => {
        const root = path.dirname(configFile);
        const facts = readProjectFacts(root, context.workspaceRoot);

        return { projects: { [root]: { targets: inferTargets(facts) } } };
      },
      configFiles,
      options,
      context,
    ),
];
