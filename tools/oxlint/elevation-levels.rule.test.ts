import { describe, expect, test } from 'bun:test';

import { Linter } from 'eslint';

import plugin from './pioneer-plugin.ts';

const COMPONENT = 'libs/frontier/src/lib/layout/panel/panel.component.ts';
const SURFACE = 'bg-surface-raised';

function messagesFor(code: string, filename: string): ReadonlyArray<string> {
  const linter = new Linter();

  const messages = linter.verify(
    code,
    [
      {
        files: ['**/*.ts'],
        languageOptions: { sourceType: 'module' },
        plugins: { pioneer: plugin },
        rules: { 'pioneer/elevation-levels': 'error' },
      },
    ],
    filename,
  );

  return messages.map(({ message }) => message);
}

describe('pioneer/elevation-levels', () => {
  test('fails a panel that sets its surface by hand', () => {
    expect(
      messagesFor("const panel = cva('border border-line-default bg-surface-raised p-md')();", COMPONENT),
    ).toHaveLength(1);
  });

  test.each([
    ['a cva string', `const a = cva('${SURFACE}')();`],
    ['a template literal in cx', `const a = cx(\`p-md ${SURFACE} \${extra}\`);`],
    ['a host class', `const a = { host: { class: '${SURFACE}' } };`],
    ['a satisfies variant map', `const a = { raised: '${SURFACE}' } satisfies Record<string, string>;`],
  ])('fails %s', (_name, code) => {
    expect(messagesFor(code, COMPONENT)).toHaveLength(1);
  });

  test('passes a panel that takes its surface from a level', () => {
    expect(messagesFor("const panel = cva(['border p-md', elevationVariants.raised])();", COMPONENT)).toEqual([]);
  });

  test('passes the canvas, sunken wells, skeletons and backdrop scrims', () => {
    expect(
      messagesFor(
        "const a = cva('bg-surface-canvas bg-surface-sunken bg-surface-skeleton backdrop:bg-surface-overlay')();",
        COMPONENT,
      ),
    ).toEqual([]);
  });

  test.each([
    ['a control', 'libs/frontier/src/lib/controls/field/field.component.ts'],
    ['a button', 'libs/frontier/src/lib/actions/button/button.component.ts'],
    ['the gem', 'libs/frontier/src/lib/text/gem/gem.component.ts'],
    ['a story', 'libs/frontier/src/lib/layout/panel/panel.stories.ts'],
    ['a spec', 'libs/frontier/src/lib/layout/panel/panel.component.spec.ts'],
    ['code outside frontier', 'apps/web/src/app/panel.component.ts'],
  ])('passes %s, which paints its own fill or is not frontier', (_name, filename) => {
    expect(messagesFor(`const a = cva('border ${SURFACE}')();`, filename)).toEqual([]);
  });

  test('ignores strings that are not class names', () => {
    expect(messagesFor(`const KEY = '${SURFACE}';`, COMPONENT)).toEqual([]);
    expect(messagesFor(`const a = label('${SURFACE}');`, COMPONENT)).toEqual([]);
  });
});
