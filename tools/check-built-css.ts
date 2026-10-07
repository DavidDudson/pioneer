/**
 * Fails if the built web stylesheet was not processed by Tailwind: raw
 * directives must be gone and known frontier utilities must exist. Guards
 * against a missing/broken PostCSS setup, which otherwise ships unstyled UI
 * with a green build.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const OUTPUT = 'dist/apps/web/browser';
const REQUIRED_UTILITIES = ['.gap-md{', '.bg-surface-raised{', '.text-heading{'];
const FORBIDDEN_DIRECTIVES = ['@theme', '@source', '@utility'];

const stylesheet = readdirSync(OUTPUT).find((file) => file.startsWith('styles') && file.endsWith('.css'));
if (stylesheet === undefined) {
  throw new Error(`No styles*.css in ${OUTPUT}; build the web app first`);
}
const css = readFileSync(path.join(OUTPUT, stylesheet), 'utf8');
const problems = [
  ...FORBIDDEN_DIRECTIVES.filter((directive) => css.includes(directive)).map((directive) => `raw ${directive} left in output`),
  ...REQUIRED_UTILITIES.filter((utility) => !css.includes(utility)).map((utility) => `missing utility ${utility}`),
];
if (problems.length > 0) {
  throw new Error(`Built CSS was not processed by Tailwind:\n- ${problems.join('\n- ')}`);
}
