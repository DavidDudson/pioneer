import { InjectionToken } from '@angular/core';
import type { Type } from '@angular/core';

/** Loads a component the character list shows beside the import links. */
export type CharacterListExtraLoader = () => Promise<Type<unknown>>;

/**
 * Extra actions on the character list. Empty in production; development builds provide the sample character
 * imports (apps/web `environment.development.ts`, wired in `app.routes.ts`).
 */
export const CHARACTER_LIST_EXTRAS = new InjectionToken<readonly CharacterListExtraLoader[]>('CHARACTER_LIST_EXTRAS', {
  factory: (): readonly CharacterListExtraLoader[] => [],
});
