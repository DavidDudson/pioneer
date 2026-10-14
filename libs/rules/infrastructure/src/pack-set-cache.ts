import type { ContentPackId } from '@pioneer/rules/sdk';

import type { StoredPackHash } from './content-repository';
import { HashKeyedCache } from './hash-keyed-cache';

/** Sets of packs kept built at once. Past this the one asked for longest ago is dropped and built again. */
const KEPT_SETS = 64;

/**
 * A `HashKeyedCache` for each set of packs asked for, up to `KEPT_SETS`, so alternating between sets does not rebuild
 * either. A set is the same in any order and with a pack named twice.
 */
export class PackSetCache<TValue> {
  readonly #sets = new Map<string, HashKeyedCache<TValue>>();

  /** The value for `packs` under `hashes` of all of them, built with `build` unless it is already cached for them. */
  public async current(
    packs: readonly ContentPackId[],
    hashes: readonly StoredPackHash[],
    build: () => Promise<TValue>,
  ): Promise<TValue> {
    return this.#cacheFor(packs).current(hashes, build);
  }

  /** The cache for this set of packs, now the most recently asked for. */
  #cacheFor(packs: readonly ContentPackId[]): HashKeyedCache<TValue> {
    const key = [...new Set(packs)].toSorted().join(',');
    const kept = this.#sets.get(key) ?? new HashKeyedCache<TValue>();
    this.#sets.delete(key);
    this.#sets.set(key, kept);
    for (const oldest of this.#sets.keys()) {
      if (this.#sets.size <= KEPT_SETS) {
        break;
      }
      this.#sets.delete(oldest);
    }
    return kept;
  }
}
