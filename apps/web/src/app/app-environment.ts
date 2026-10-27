import type { Provider } from '@angular/core';
import type { Translation } from '@jsverse/transloco';
import type { CharacterListExtraLoader } from '@pioneer/character/feature';

/**
 * What a build configuration adds to the app: providers, and root messages for them. `environment.ts` is
 * production's; the `development` build configuration swaps in `environment.development.ts`.
 */
export interface AppEnvironment {
  readonly providers: readonly Provider[];
  readonly messages: Translation;
  /** Extra actions on the character list; the character feature is lazy, so each one is loaded on demand. */
  readonly characterListExtras: readonly CharacterListExtraLoader[];
}
