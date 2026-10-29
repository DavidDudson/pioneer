import { describe, expect, test } from 'bun:test';

import { filterOf, selectJobs, touches } from './ci-plan.ts';
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
