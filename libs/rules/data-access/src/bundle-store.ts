import { InjectionToken } from '@angular/core';
import type { BundlePath } from '@pioneer/rules/sdk';

import { IndexedDbBundleStore } from './indexed-db-bundle-store';
import { MemoryBundleStore } from './memory-bundle-store';

/** Where the manifest is kept beside the bundles. A bundle path always holds a `/`, so it never takes this key. */
export const MANIFEST_KEY = 'manifest';

/** What the store keeps: each bundle under its path, and the last manifest read. */
export type StoredKey = BundlePath | typeof MANIFEST_KEY;

/** Port: where the browser keeps content between visits. Bodies are kept as read and checked again on use. */
export interface BundleStore {
  /** The body kept under `key`, or undefined when none is. */
  readonly read: (key: StoredKey) => Promise<unknown>;
  readonly write: (key: StoredKey, body: unknown) => Promise<void>;
  readonly keys: () => Promise<readonly StoredKey[]>;
  readonly remove: (keys: readonly StoredKey[]) => Promise<void>;
}

/** Where content is kept: IndexedDB when the browser has it, else memory for the page's life. */
export const CONTENT_BUNDLE_STORE = new InjectionToken<BundleStore>('CONTENT_BUNDLE_STORE', {
  providedIn: 'root',
  factory: (): BundleStore =>
    'indexedDB' in globalThis ? new IndexedDbBundleStore(globalThis.indexedDB) : new MemoryBundleStore(),
});
