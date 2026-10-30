/**
 * Plans a CI run: `bun tools/ci-plan-run.ts`. Finds the commit to compare against, asks Nx which projects the change
 * affects, and writes to $GITHUB_OUTPUT the matrices of the `check` and `test` jobs (.github/ci-jobs.json) cut to the
 * jobs that cover an affected project, with the base commit the jobs hand to `nx affected`. CI runs it from the
 * `plan` job of .github/workflows/ci.yml.
 */
import { appendFile } from 'node:fs/promises';

import { JobsFile, selectJobs, touches } from './ci-plan.ts';
import type { AffectedIn, JobEntry, ProjectFilter } from './ci-plan.ts';

/** Git's empty tree: as a base, every file counts as changed, so every project is affected. */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const WORKFLOW_FILES = ['.github/', 'flake.nix', 'flake.lock'];
const INFRA_FILES = ['infra/', 'flake.nix', 'flake.lock'];
const EDGE_PROJECT = 'edge';
const SHOWN_OUTPUT = 500;

interface GitResult {
  readonly code: number;
  readonly stdout: string;
}

async function git(...args: readonly string[]): Promise<GitResult> {
  const child = Bun.spawn(['git', ...args], { stdout: 'pipe', stderr: 'ignore' });
  const [stdout, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
  return { code, stdout: stdout.trim() };
}

/** The sha of the last main run of this workflow that passed: what main has already been proved to be. */
async function lastPassedOnMain(): Promise<string | undefined> {
  const repository = Bun.env['GITHUB_REPOSITORY'];
  const token = Bun.env['GH_TOKEN'];
  if (repository === undefined || token === undefined) {
    return undefined;
  }
  const url = `https://api.github.com/repos/${repository}/actions/workflows/ci.yml/runs?branch=main&event=push&status=success&per_page=1`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    return undefined;
  }
  const body = (await response.json()) as { readonly workflow_runs?: readonly { readonly head_sha?: string }[] };
  return body.workflow_runs?.[0]?.head_sha;
}

/**
 * What the change is measured against. A pull request is checked out as a merge into its base, so its first parent is
 * the base: the diff is the pull request alone. A push to main is measured from the last run that passed, so a commit
 * whose run was cancelled or failed is still covered. Anything unknown falls back to the empty tree, which runs
 * everything. `CI_PLAN_BASE` sets it by hand, to try the plan on a diff locally.
 */
async function baseCommit(): Promise<string> {
  const override = Bun.env['CI_PLAN_BASE'];
  if (override !== undefined) {
    return override;
  }
  if (Bun.env['GITHUB_EVENT_NAME'] === 'pull_request') {
    const parent = await git('rev-parse', '--verify', 'HEAD^1');
    return parent.code === 0 ? parent.stdout : EMPTY_TREE;
  }
  const passed = await lastPassedOnMain();
  if (passed === undefined) {
    return EMPTY_TREE;
  }
  const known = await git('cat-file', '-e', `${passed}^{commit}`);
  const ancestor = await git('merge-base', '--is-ancestor', passed, 'HEAD');
  return known.code === 0 && ancestor.code === 0 ? passed : EMPTY_TREE;
}

function affectedBy(base: string): AffectedIn {
  return async ({ projects, exclude }: ProjectFilter): Promise<readonly string[]> => {
    const flags = [
      ...(projects === undefined ? [] : [`--projects=${projects}`]),
      ...(exclude === undefined ? [] : [`--exclude=${exclude}`]),
    ];
    const child = Bun.spawn(
      ['bunx', 'nx', 'show', 'projects', '--affected', `--base=${base}`, '--head=HEAD', '--json', ...flags],
      {
        stdout: 'pipe',
        stderr: 'inherit',
      },
    );
    const [stdout, code] = await Promise.all([new Response(child.stdout).text(), child.exited]);
    if (code !== 0) {
      throw new Error(`nx show projects failed (${code}) for ${flags.join(' ')}`);
    }
    return parseProjects(stdout);
  };
}

/** The project names Nx printed. Nothing affected prints `[]`, so output without a list is an error, not no projects. */
function parseProjects(stdout: string): readonly string[] {
  const start = stdout.indexOf('[');
  if (start === -1) {
    throw new Error(`nx show projects printed no project list: ${JSON.stringify(stdout.slice(0, SHOWN_OUTPUT))}`);
  }
  return JSON.parse(stdout.slice(start)) as string[];
}

const matrixOf = (entries: readonly JobEntry[]): string => JSON.stringify({ include: entries });

const base = await baseCommit();
const diff = await git('diff', '--name-only', base, 'HEAD');
const changed = diff.stdout.split('\n').filter((file) => file !== '');
const jobs = JobsFile.parse(await Bun.file('.github/ci-jobs.json').json());
const affectedIn = affectedBy(base);
const [check, test, edge] = await Promise.all([
  selectJobs(jobs.check, affectedIn),
  selectJobs(jobs.test, affectedIn),
  affectedIn({ projects: EDGE_PROJECT, exclude: undefined }),
]);

const outputs: Readonly<Record<string, string>> = {
  base,
  fetch_base: String(base !== EMPTY_TREE),
  check: matrixOf(check),
  test: matrixOf(test),
  run_check: String(check.length > 0),
  run_test: String(test.length > 0),
  workflows: String(touches(changed, WORKFLOW_FILES)),
  infra: String(touches(changed, INFRA_FILES) || edge.length > 0),
};
console.info(`Base ${base}: ${changed.length} files changed`);
console.info(`check: ${check.map(({ id }) => id).join(', ') || 'none'}`);
console.info(`test: ${test.map(({ id }) => id).join(', ') || 'none'}`);

const outputFile = Bun.env['GITHUB_OUTPUT'];
const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`);
if (outputFile === undefined) {
  console.info(lines.join(''));
} else {
  await appendFile(outputFile, lines.join(''));
}
