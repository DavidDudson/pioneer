import { InjectionToken } from '@angular/core';
import type { ContentPack } from '@pioneer/rules/sdk';

/**
 * Packs `ContentLoader` has built, keyed by the bundle paths they were built from. A bundle's path carries its hash,
 * so a key always names the same content: a pack built once is never checked and parsed again, whichever kinds' pages
 * ask for it later. Bodies are still read, so what is fetched and kept does not change.
 */
export type ContentPackCache = Map<string, ContentPack>;

/** Shared by every injector, so a pack built once in a page (or a spec) is reused by the next. */
const shared: ContentPackCache = new Map();

export const CONTENT_PACK_CACHE = new InjectionToken<ContentPackCache>('CONTENT_PACK_CACHE', {
  providedIn: 'root',
  factory: (): ContentPackCache => shared,
});
