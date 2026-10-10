import type { Provider } from '@angular/core';
import type { Translation } from '@jsverse/transloco';

/**
 * What a build configuration adds to the app: providers, and root messages for them. `environment.ts` is
 * production's; the `development` build configuration swaps in `environment.development.ts`.
 */
export interface AppEnvironment {
  readonly providers: readonly Provider[];
  readonly messages: Translation;
}
