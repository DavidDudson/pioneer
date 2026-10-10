import type { AppEnvironment } from './app-environment';

/**
 * Production adds nothing. The `development` build configuration replaces this file with
 * `environment.development.ts` (project.json `fileReplacements`), so dev-only code never reaches a production
 * bundle; the `verify-dev-free` target checks the output.
 */
export const environment: AppEnvironment = { providers: [], messages: {} };
