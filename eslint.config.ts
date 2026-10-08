/**
 * ESLint runs on Angular templates (*.html) only; oxlint owns all TypeScript.
 * No Rust linter can parse Angular templates yet (see AGENTS.md#tooling).
 */
import angular from 'angular-eslint';
import type { Linter } from 'eslint';

import { layoutVariants } from './tools/eslint/layout-variants';
import { noInterruptions } from './tools/eslint/no-interruptions';
import { noTemplateStyling } from './tools/eslint/no-template-styling';

const config: Linter.Config[] = [
  { ignores: ['dist/**', 'coverage/**', '.angular/**', '.nx/**', 'apps/web/src/index.html'] },
  ...angular.configs.templateAll.map((entry) => ({ ...entry, files: ['**/*.html'] })),
  ...angular.configs.templateAccessibility.map((entry) => ({ ...entry, files: ['**/*.html'] })),
  {
    files: ['**/*.html'],
    plugins: {
      pioneer: {
        rules: {
          'no-template-styling': noTemplateStyling,
          'no-interruptions': noInterruptions,
          'layout-variants': layoutVariants,
        },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'pioneer/no-template-styling': 'error',
      'pioneer/no-interruptions': 'error',
      // Only frontier may style at all, so only its classes need checking.
      'pioneer/layout-variants': 'off',
      // Copy is English-only for now; revisit when i18n lands.
      '@angular-eslint/template/i18n': 'off',
      // Signals are called in templates by design.
      '@angular-eslint/template/no-call-expression': 'off',
    },
  },
  { files: ['libs/frontier/**/*.html'], rules: { 'pioneer/layout-variants': 'error' } },
];

export default config;
