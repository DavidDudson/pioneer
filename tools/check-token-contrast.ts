/**
 * Fails when a declared foreground/background token pair (libs/frontier/src/styles/contrast-pairs.ts) is
 * below its WCAG 2 contrast minimum in any theme × colour mode. The stylesheets are the ones frontier.css
 * imports, in its order, so the cascade matches the browser's.
 */
import path from 'node:path';

import { parse } from 'postcss';

import { ColorMode, Theme } from '../libs/frontier/src/lib/theme/theme.ts';
import { CONTRAST_PAIRS } from '../libs/frontier/src/styles/contrast-pairs.ts';
import { cascade, measurePairs, parseTokenRules } from './token-contrast.ts';

const ENTRY = 'libs/frontier/src/styles/frontier.css';
const RELATIVE_IMPORT = /^['"](?<target>\.{1,2}\/[^'"]+)['"]/u;

const entryCss = await Bun.file(ENTRY).text();
const importPaths: string[] = [];
parse(entryCss).walkAtRules('import', (rule) => {
  const target = RELATIVE_IMPORT.exec(rule.params)?.groups?.['target'];
  if (target !== undefined) {
    importPaths.push(path.join(path.dirname(ENTRY), target));
  }
});
const stylesheets = await Promise.all(importPaths.map(async (file) => Bun.file(file).text()));
const rules = parseTokenRules([...stylesheets, entryCss]);

const failures = Object.values(Theme).flatMap((theme) =>
  Object.values(ColorMode).flatMap((mode) =>
    measurePairs(cascade(rules, { 'data-theme': theme, 'data-mode': mode }), CONTRAST_PAIRS)
      .filter(({ ratio, minimum }) => ratio < minimum)
      .map(
        ({ foreground, background, ratio, minimum }) =>
          `${theme} ${mode}: ${foreground} on ${background} is ${ratio.toFixed(2)}:1, needs ${minimum}:1`,
      ),
  ),
);
if (failures.length > 0) {
  throw new Error(`Token pairs below their WCAG 2 contrast minimum:\n- ${failures.join('\n- ')}`);
}
