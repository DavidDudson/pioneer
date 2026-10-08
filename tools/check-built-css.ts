/**
 * Fails if the built web stylesheet was not processed by Tailwind: raw
 * directives must be gone and known frontier utilities must exist. Guards
 * against a missing/broken PostCSS setup, which otherwise ships unstyled UI
 * with a green build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const OUTPUT = 'dist/apps/web/browser';
// Container query utilities prove frontier's `@sm`/`@md`/`@lg` sizes exist.
const REQUIRED_UTILITIES = [
  '.gap-md{',
  '.bg-surface-raised{',
  '.text-heading{',
  String.raw`@container (width >= 40rem){.\@md\:`,
  String.raw`@container (width >= 56rem){.\@lg\:`,
];
const FORBIDDEN_DIRECTIVES = ['@theme', '@source', '@utility'];
// Frontier has no viewport breakpoints; only media queries for preferences and input remain.
const VIEWPORT_QUERY = /@media\s*\((?:min-|max-)?width/u;

const stylesheet = readdirSync(OUTPUT).find((file) => file.startsWith('styles') && file.endsWith('.css'));
if (stylesheet === undefined) {
  throw new Error(`No styles*.css in ${OUTPUT}; build the web app first`);
}
const css = readFileSync(path.join(OUTPUT, stylesheet), 'utf8');
const problems = [
  ...FORBIDDEN_DIRECTIVES.filter((directive) => css.includes(directive)).map(
    (directive) => `raw ${directive} left in output`,
  ),
  ...REQUIRED_UTILITIES.filter((utility) => !css.includes(utility)).map((utility) => `missing utility ${utility}`),
  ...(VIEWPORT_QUERY.test(css) ? ['viewport width media query in output; use container queries'] : []),
];
if (problems.length > 0) {
  throw new Error(`Built CSS is wrong:\n- ${problems.join('\n- ')}`);
}
