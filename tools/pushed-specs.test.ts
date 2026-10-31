import { describe, expect, test } from 'bun:test';

import { commandsOf, specRunsOf } from './pushed-specs.ts';

const PROJECTS: ReadonlySet<string> = new Set(['libs/character/feature', 'apps/api']);
const hasProject = (directory: string): boolean => PROJECTS.has(directory);
const everything = (): boolean => true;

describe('specRunsOf', () => {
  test('groups Angular specs by project and sends *.test.ts to bun', () => {
    const runs = specRunsOf(
      [
        'libs/character/feature/src/a.spec.ts',
        'libs/character/feature/src/lib/b.spec.ts',
        'apps/api/src/c.test.ts',
        'apps/api/src/d.ts',
      ],
      hasProject,
      everything,
    );
    expect([...runs.angular]).toStrictEqual([['libs/character/feature', ['a.spec.ts', 'b.spec.ts']]]);
    expect(runs.bun).toStrictEqual(['apps/api/src/c.test.ts']);
  });

  test('leaves database tests to CI', () => {
    expect(specRunsOf(['apps/api/src/x.db.test.ts'], hasProject, everything).bun).toStrictEqual([]);
  });

  test('skips a spec the push deleted', () => {
    const runs = specRunsOf(['libs/character/feature/src/gone.spec.ts'], hasProject, () => false);
    expect(runs.angular.size).toBe(0);
  });

  test('skips a spec no project owns', () => {
    expect(specRunsOf(['stray/a.spec.ts'], hasProject, everything).angular.size).toBe(0);
  });
});

describe('commandsOf', () => {
  test('runs bun tests first, then each project with its specs included', () => {
    const runs = specRunsOf(['libs/character/feature/src/a.spec.ts', 'apps/api/src/c.test.ts'], hasProject, everything);
    expect(commandsOf(runs, () => 'character-feature')).toStrictEqual([
      ['bun', 'test', 'apps/api/src/c.test.ts'],
      ['bunx', 'nx', 'run', 'character-feature:test', '--skip-nx-cache', '--include=**/a.spec.ts'],
    ]);
  });

  test('is empty when no spec changed', () => {
    expect(commandsOf(specRunsOf(['README.md'], hasProject, everything), () => 'x')).toStrictEqual([]);
  });
});
