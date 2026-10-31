import { InjectionToken, signal } from '@angular/core';
import type { Signal } from '@angular/core';
import type { ContentPackId } from '@pioneer/rules/sdk';

/**
 * The homebrew packs a page may browse and search besides the official ones. `ready` is false while the list is still
 * loading, so a page waits for it instead of building over official packs alone and then again.
 */
export interface ContentScope {
  readonly homebrew: readonly ContentPackId[];
  readonly ready: boolean;
}

/** Official packs only, which is all anyone sees with no character open (ADR-0007). */
const OFFICIAL_ONLY: ContentScope = { homebrew: [], ready: true };

/**
 * What the content around a page may show. A container that knows the open character's effective packs (its
 * campaign's, else its own) provides this once, so the content browser, entries and search below it list only those
 * packs without each being passed them. Without a provider it is the official packs.
 */
export const CONTENT_SCOPE = new InjectionToken<Signal<ContentScope>>('CONTENT_SCOPE', {
  factory: (): Signal<ContentScope> => signal(OFFICIAL_ONLY),
});
