import { describe, expect, test } from 'bun:test';

import { filterOf, planGaps, selectJobs, touches } from './ci-plan.ts';
import type { AffectedIn, JobEntry } from './ci-plan.ts';

const entry = (id: string, args: string, always?: boolean): JobEntry => ({
  name: id,
  id,
  args,
  ...(always === undefined ? {} : { always }),
});

describe('filterOf', () => {
  test('reads projects and exclude, and ignores other flags', () => {
    expect(filterOf('--projects=tag:platform:web --exclude=a,b --parallel=2')).toStrictEqual({
      projects: 'tag:platform:web',
      exclude: 'a,b',
    });
  });

  test('has neither for no arguments', () => {
    expect(filterOf('')).toStrictEqual({ projects: undefined, exclude: undefined });
  });

  test('does not take a configuration for a project', () => {
    expect(filterOf('--projects=api --configuration=rest').projects).toBe('api');
  });
});

const AFFECTED_BY_PROJECT: Readonly<Record<string, readonly string[]>> = { api: ['api'] };
const onlyApi: AffectedIn = async ({ projects }) => AFFECTED_BY_PROJECT[projects ?? ''] ?? [];
const everything: AffectedIn = async () => ['shared-kernel'];
const nothing: AffectedIn = async () => [];

describe('selectJobs', () => {
  const entries = [
    entry('lint', '', true),
    entry('api', '--projects=api'),
    entry('character', '--projects=character-feature'),
    entry('all', ''),
  ];

  test('keeps a job whose projects are affected, and the jobs that always run', async () => {
    const selected = await selectJobs(entries, onlyApi);

    expect(selected.map(({ id }) => id)).toStrictEqual(['lint', 'api']);
  });

  test('keeps a job for every project when anything is affected', async () => {
    const selected = await selectJobs(entries, everything);

    expect(selected).toHaveLength(entries.length);
  });

  test('keeps only the jobs that always run when nothing is affected', async () => {
    const selected = await selectJobs(entries, nothing);

    expect(selected.map(({ id }) => id)).toStrictEqual(['lint']);
  });
});

describe('touches', () => {
  test('matches a file under a prefix and a file named exactly', () => {
    expect(touches(['.github/workflows/ci.yml'], ['.github/'])).toBe(true);
    expect(touches(['flake.lock'], ['flake.lock'])).toBe(true);
  });

  test('ignores other files', () => {
    expect(touches(['docs/architecture/rules-engine.md'], ['.github/', 'infra/'])).toBe(false);
  });
});

const affectedNames: AffectedIn = async () => ['a', 'b'];

describe('selectJobs arguments', () => {
  test('names the affected projects in place of the filter, keeping the other flags', async () => {
    const selected = await selectJobs(
      [entry('web', '--projects=tag:platform:web --exclude=c --parallel=2 --configuration=rest')],
      affectedNames,
    );

    expect(selected.map(({ args }) => args)).toStrictEqual(['--parallel=2 --configuration=rest --projects=a,b']);
  });

  test('leaves an entry with no filter as it is', async () => {
    const selected = await selectJobs([entry('all', '')], affectedNames);

    expect(selected.map(({ args }) => args)).toStrictEqual(['']);
  });
});

describe('planGaps', () => {
  const build = entry('build', '');
  const lint = entry('lint', '', true);
  const web = entry('web', '--projects=tag:platform:web');

  test('is empty when the plan covers the change', () => {
    expect(planGaps(['libs/a/src/a.ts', 'libs/a/src/a.spec.ts'], [lint, build], [web])).toStrictEqual([]);
  });

  test('flags changed project source with no typecheck and build job', () => {
    expect(planGaps(['libs/a/src/a.ts'], [lint], [])).toHaveLength(1);
    expect(planGaps(['apps/web/src/app.component.html'], [lint], [web])).toHaveLength(1);
  });

  test('flags a changed spec with no test job', () => {
    expect(planGaps(['libs/a/src/a.spec.ts'], [lint, build], [])).toHaveLength(1);
  });

  test('leaves a changed tools spec to the lint job, which runs it', () => {
    expect(planGaps(['tools/ci-plan.test.ts'], [lint], [])).toStrictEqual([]);
    expect(planGaps(['tools/ci-plan.test.ts'], [build], [])).toHaveLength(1);
  });

  test('lets a change to docs, content or workflows plan little', () => {
    expect(planGaps(['docs/readme.md', 'content/packs/a.json', '.github/workflows/ci.yml'], [lint], [])).toStrictEqual(
      [],
    );
  });
});
