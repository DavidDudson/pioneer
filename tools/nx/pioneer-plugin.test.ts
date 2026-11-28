import { describe, expect, test } from 'bun:test';

import { inferTargets } from './pioneer-plugin.ts';
import type { ProjectFacts } from './project-facts.ts';

/** A project holding exactly these files (paths relative to its folder), the way `readProjectFacts` answers for a real one. */
function projectOf(root: string, isAngular: boolean, files: ReadonlyArray<string>): ProjectFacts {
  return {
    root,
    isAngular,
    exists: (file) => files.includes(file),
    hasFile: (matches) => files.some((file) => matches(file.split('/').pop() ?? file)),
  };
}

const SETUP = 'src/test-setup.ts';

describe('test', () => {
  test('an Angular project with a spec tsconfig runs the Angular builder', () => {
    const { test: target } = inferTargets(projectOf('libs/a/ui', true, ['tsconfig.spec.json']));

    expect(target?.executor).toBe('@angular/build:unit-test');
    expect(target?.options).toStrictEqual({
      buildTarget: 'web:build:development',
      tsConfig: 'libs/a/ui/tsconfig.spec.json',
      runner: 'vitest',
    });
  });

  test('a test setup file beside the sources is loaded', () => {
    const { test: target } = inferTargets(projectOf('libs/a/ui', true, ['tsconfig.spec.json', SETUP]));

    expect(target?.options).toStrictEqual({
      buildTarget: 'web:build:development',
      tsConfig: 'libs/a/ui/tsconfig.spec.json',
      runner: 'vitest',
      setupFiles: [`libs/a/ui/${SETUP}`],
    });
  });

  test('a spec tsconfig below the project root does not count', () => {
    const { test: target } = inferTargets(projectOf('libs/a/ui', true, ['src/tsconfig.spec.json']));

    expect(target).toBeUndefined();
  });

  test('a project with *.test.ts files runs bun test', () => {
    const { test: target } = inferTargets(projectOf('libs/a/domain', false, ['src/a.test.ts']));

    expect(target?.command).toBe('bun test libs/a/domain');
  });

  test('*.spec.ts files alone do not enable bun test', () => {
    const { test: target } = inferTargets(projectOf('libs/a/domain', false, ['src/a.spec.ts']));

    expect(target).toBeUndefined();
  });

  test('an Angular project with both kinds of file takes the Angular builder', () => {
    const { test: target } = inferTargets(projectOf('libs/a/ui', true, ['tsconfig.spec.json', 'src/a.test.ts']));

    expect(target?.executor).toBe('@angular/build:unit-test');
  });

  test('a project with neither has no test target', () => {
    expect('test' in inferTargets(projectOf('libs/a/domain', false, []))).toBe(false);
  });
});

describe('typecheck', () => {
  test('an Angular project is checked with ngc', () => {
    const { typecheck } = inferTargets(projectOf('libs/a/ui', true, []));

    expect(typecheck?.command).toBe('ngc -p libs/a/ui/tsconfig.json --noEmit');
  });

  test('any other project is checked with bun check', () => {
    const { typecheck } = inferTargets(projectOf('libs/a/domain', false, []));

    expect(typecheck?.command).toBe('bun check --no-script -p libs/a/domain/tsconfig.json');
  });
});

describe('lint-templates', () => {
  test('an Angular project with a template has it', () => {
    const targets = inferTargets(projectOf('libs/a/ui', true, ['src/a.component.html']));

    expect(targets['lint-templates']?.command).toBe(`eslint --max-warnings=0 'libs/a/ui/**/*.html'`);
  });

  test('an Angular project with no template does not', () => {
    expect('lint-templates' in inferTargets(projectOf('libs/a/ui', true, ['src/a.ts']))).toBe(false);
  });

  test('a project that is not Angular does not, even with a template', () => {
    expect('lint-templates' in inferTargets(projectOf('libs/a/domain', false, ['a.html']))).toBe(false);
  });
});

describe('test-storybook', () => {
  const STORYBOOK_CONFIG = '.storybook/vitest.config.ts';
  const SHARED_INPUT = '{workspaceRoot}/libs/frontier/.storybook/storybook-project.ts';

  test('a library with a Storybook Vitest config reruns when the shared helper changes', () => {
    const targets = inferTargets(projectOf('libs/play/ui', true, [STORYBOOK_CONFIG]));

    expect(targets['test-storybook']?.inputs).toContain(SHARED_INPUT);
    expect(targets['test-storybook']?.command).toBe(`vitest run --config libs/play/ui/${STORYBOOK_CONFIG}`);
  });

  test('Frontier, which owns the helper, does not list it', () => {
    const targets = inferTargets(projectOf('libs/frontier', true, [STORYBOOK_CONFIG]));

    expect(targets['test-storybook']?.inputs).not.toContain(SHARED_INPUT);
  });

  test('a project with no Storybook Vitest config has no such target', () => {
    expect('test-storybook' in inferTargets(projectOf('libs/play/ui', true, []))).toBe(false);
  });
});
