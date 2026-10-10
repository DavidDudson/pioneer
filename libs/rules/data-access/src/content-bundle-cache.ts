import { inject, Injectable } from '@angular/core';
import { bundlePath, ContentManifest } from '@pioneer/rules/sdk';
import type { BundleFile, PackId } from '@pioneer/rules/sdk';

import { CONTENT_BUNDLE_STORE, MANIFEST_KEY } from './bundle-store';
import type { StoredKey } from './bundle-store';
import { CONTENT_DELIVERY } from './content-delivery';

/** Every key a manifest keeps in the store: itself and each bundle it names. */
function currentKeys(manifest: ContentManifest): ReadonlySet<StoredKey> {
  const paths = manifest.packs.flatMap((pack) =>
    [pack.file, ...pack.kinds.flatMap((kind) => [kind.mechanics, kind.names])].map((file) => bundlePath(pack.id, file)),
  );
  return new Set<StoredKey>([MANIFEST_KEY, ...paths]);
}

/**
 * Content as the browser holds it (content-model.md, "Delivery to the browser"). The manifest is read once a session;
 * a bundle is fetched once ever, kept by path (its hash is in the name), and served from the store after. Bundles no
 * current manifest names are evicted. Offline, the last manifest read stands in, so every kind kept still loads.
 *
 * The store is a cache: when it fails, content is fetched as if nothing were kept.
 */
@Injectable({ providedIn: 'root' })
export class ContentBundleCache {
  readonly #delivery = inject(CONTENT_DELIVERY);
  readonly #store = inject(CONTENT_BUNDLE_STORE);
  #manifest: Promise<ContentManifest> | undefined;

  /** The current manifest, read once a session. A failed read is not kept, so the next ask tries again. */
  public async manifest(): Promise<ContentManifest> {
    const manifest = this.#manifest ?? this.#readManifest();
    this.#manifest = manifest;
    try {
      return await manifest;
    } catch (error) {
      if (this.#manifest === manifest) {
        this.#manifest = undefined;
      }
      throw error;
    }
  }

  /**
   * Drops the session's manifest, so the next ask reads it again: for when a bundle it names is gone (a re-seed since
   * it was read, or another tab evicted it).
   */
  public forgetManifest(): void {
    this.#manifest = undefined;
  }

  /** Drops `files` of `pack` from the store, so the next ask fetches them again. */
  public async forget(pack: PackId, files: readonly BundleFile[]): Promise<void> {
    try {
      await this.#store.remove(files.map((file) => bundlePath(pack, file)));
    } catch {
      // Nothing more to do: the store already fails, so reads miss and fetch anyway.
    }
  }

  /** A bundle's body: from the store when kept, else fetched and kept. */
  public async bundle(pack: PackId, file: BundleFile): Promise<unknown> {
    const path = bundlePath(pack, file);
    const kept = await this.#read(path);
    if (kept !== undefined) {
      return kept;
    }
    const body = await this.#delivery.bundle(pack, file);
    await this.#write(path, body);
    return body;
  }

  async #readManifest(): Promise<ContentManifest> {
    try {
      const manifest = await this.#delivery.manifest();
      await this.#write(MANIFEST_KEY, manifest);
      await this.#evict(manifest);
      return manifest;
    } catch (error) {
      const kept = ContentManifest.safeParse(await this.#read(MANIFEST_KEY));
      if (kept.success) {
        return kept.data;
      }
      throw error;
    }
  }

  /** Removes every bundle `manifest` no longer names. */
  async #evict(manifest: ContentManifest): Promise<void> {
    const current = currentKeys(manifest);
    try {
      const kept = await this.#store.keys();
      const stale = kept.filter((key) => !current.has(key));
      if (stale.length > 0) {
        await this.#store.remove(stale);
      }
    } catch {
      // Stale bundles cost space, not correctness; the next session tries again.
    }
  }

  async #read(key: StoredKey): Promise<unknown> {
    try {
      return await this.#store.read(key);
    } catch {
      return undefined;
    }
  }

  async #write(key: StoredKey, body: unknown): Promise<void> {
    try {
      await this.#store.write(key, body);
    } catch {
      // Not kept: the next visit fetches it again.
    }
  }
}
