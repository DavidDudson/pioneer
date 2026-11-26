import { InjectionToken } from '@angular/core';
import type { ContentEntry, ContentPack } from '@pioneer/rules/sdk';

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

/**
 * A kind's entries `ContentLoader` has read, keyed by the paths of the kind's mechanics and names bundles. The sheet
 * builds a registry for each set of kinds it reads, and the packs of two sets differ, but a kind they share is read
 * once, so the registries hold the same entry objects. One per injector, unlike the packs: the entries are what
 * registries and what is built from them share, so a session has one set.
 */
export type ContentEntryCache = Map<string, readonly ContentEntry[]>;

export const CONTENT_ENTRY_CACHE = new InjectionToken<ContentEntryCache>('CONTENT_ENTRY_CACHE', {
  providedIn: 'root',
  factory: (): ContentEntryCache => new Map(),
});
