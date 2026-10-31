import { describe, expect, test } from 'bun:test';

import { isScript, projectRootOf, projectRootsOf } from './staged-typecheck.ts';

const PROJECTS: ReadonlySet<string> = new Set(['libs/character/feature', 'apps/web', 'tools']);
const hasProject = (directory: string): boolean => PROJECTS.has(directory);

describe('projectRootOf', () => {
  test('is the nearest project above the file', () => {
    expect(projectRootOf('libs/character/feature/src/lib/sheet/a.spec.ts', hasProject)).toBe('libs/character/feature');
  });

  test('is the project of a file at its root', () => {
    expect(projectRootOf('tools/ci-plan.ts', hasProject)).toBe('tools');
  });

  test('is undefined for a file no project owns', () => {
    expect(projectRootOf('docs/architecture/content-model.md', hasProject)).toBeUndefined();
    expect(projectRootOf('package.json', hasProject)).toBeUndefined();
  });
});

describe('projectRootsOf', () => {
  test('names each project once, in order', () => {
    const files = ['tools/b.ts', 'apps/web/src/a.ts', 'tools/a.ts', 'README.md', 'apps/web/src/b.ts'];
    expect(projectRootsOf(files, hasProject)).toStrictEqual(['apps/web', 'tools']);
  });

  test('is empty for no staged files in a project', () => {
    expect(projectRootsOf(['README.md'], hasProject)).toStrictEqual([]);
  });
});

describe('isScript', () => {
  test('is true for the tools and the Frontier scripts', () => {
    expect(isScript('tools/ci-plan.ts')).toBe(true);
    expect(isScript('libs/frontier/scripts/generate-ramps.ts')).toBe(true);
  });

  test('is false for a project file', () => {
    expect(isScript('libs/frontier/src/index.ts')).toBe(false);
  });
});
