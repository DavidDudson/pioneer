import { InjectionToken } from '@angular/core';
import type { BundleBody, BundlePath } from '@pioneer/rules/sdk';
import type { ContentLocale } from '@pioneer/shared/kernel';

import { IndexedDbBundleStore } from './indexed-db-bundle-store';
import { MemoryBundleStore } from './memory-bundle-store';

/** Where the manifest is kept beside the bundles. A bundle path always holds a `/`, so it never takes this key. */
export const MANIFEST_KEY = 'manifest';

/** The key the last manifest read in `locale` is kept under. A bundle path always holds a `/`, so it never takes one. */
export type ManifestKey = typeof MANIFEST_KEY | `${typeof MANIFEST_KEY}:${ContentLocale}`;

export function manifestKey(locale: ContentLocale): ManifestKey {
  return `${MANIFEST_KEY}:${locale}`;
}

/** What the store keeps: each bundle under its path, and the last manifest read in a locale. */
export type StoredKey = BundlePath | ManifestKey;

/** Port: where the browser keeps content between visits. Bodies are kept as read and checked again on use. */
export interface BundleStore {
  /** The body kept under `key`, or undefined when none is. */
  readonly read: (key: StoredKey) => Promise<BundleBody | undefined>;
  readonly write: (key: StoredKey, body: BundleBody) => Promise<void>;
  readonly keys: () => Promise<readonly StoredKey[]>;
  readonly remove: (keys: readonly StoredKey[]) => Promise<void>;
}

/** Where content is kept: IndexedDB when the browser has it, else memory for the page's life. */
export const CONTENT_BUNDLE_STORE = new InjectionToken<BundleStore>('CONTENT_BUNDLE_STORE', {
  providedIn: 'root',
  factory: (): BundleStore =>
    'indexedDB' in globalThis ? new IndexedDbBundleStore(globalThis.indexedDB) : new MemoryBundleStore(),
});
