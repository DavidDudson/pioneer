import type { StoredPackHash } from './content-repository';

/** A value being built or built, and the stored hashes it was asked for under. */
interface CachedValue<TValue> {
  readonly key: string;
  readonly value: Promise<TValue>;
}

function cacheKey(hashes: readonly StoredPackHash[], variant: string): string {
  return `${hashes.map(({ pack, hash }) => `${pack}:${hash}`).join(',')}|${variant}`;
}

/**
 * One value made from the official packs, kept while their stored hashes stay the same. A re-seed (or a pack added
 * or removed) changes the hashes, so the next ask builds again. Concurrent asks share one build; a failed build is
 * dropped, so the next ask tries again.
 */
export class HashKeyedCache<TValue> {
  #cached: CachedValue<TValue> | undefined;

  /**
   * The value for `hashes`, built with `build` unless it is already cached for them. `build` must read after them.
   * `variant` is whatever else the value is made from and that changes without a pack hash: a locale's text version.
   */
  public async current(hashes: readonly StoredPackHash[], build: () => Promise<TValue>, variant = ''): Promise<TValue> {
    const key = cacheKey(hashes, variant);
    const cached = this.#cached?.key === key ? this.#cached : { key, value: build() };
    this.#cached = cached;

    try {
      return await cached.value;
    } catch (error) {
      if (this.#cached === cached) {
        this.#cached = undefined;
      }

      throw error;
    }
  }
}
