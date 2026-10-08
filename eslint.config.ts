/**
 * ESLint runs on Angular templates (*.html) only; oxlint owns all TypeScript.
 * No Rust linter can parse Angular templates yet (see AGENTS.md#tooling).
 */
import angular from 'angular-eslint';
import type { Linter } from 'eslint';

import { noInterruptions } from './tools/eslint/no-interruptions';
import { noNativeElements } from './tools/eslint/no-native-elements';
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
          'no-native-elements': noNativeElements,
        },
      },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'pioneer/no-template-styling': 'error',
      'pioneer/no-interruptions': 'error',
      'pioneer/no-native-elements': 'error',
      // Copy is English-only for now; revisit when i18n lands.
      '@angular-eslint/template/i18n': 'off',
      // Signals are called in templates by design.
      '@angular-eslint/template/no-call-expression': 'off',
    },
  },
];

export default config;
