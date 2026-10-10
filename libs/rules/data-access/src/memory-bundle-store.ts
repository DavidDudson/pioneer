import type { BundleStore, StoredKey } from './bundle-store';

/** A store that lasts as long as the page: where IndexedDB is missing, and in tests. */
export class MemoryBundleStore implements BundleStore {
  readonly #bodies = new Map<StoredKey, unknown>();

  public readonly read = async (key: StoredKey): Promise<unknown> => this.#bodies.get(key);

  public readonly write = async (key: StoredKey, body: unknown): Promise<void> => {
    this.#bodies.set(key, body);
  };

  public readonly keys = async (): Promise<readonly StoredKey[]> => [...this.#bodies.keys()];

  public readonly remove = async (keys: readonly StoredKey[]): Promise<void> => {
    for (const key of keys) {
      this.#bodies.delete(key);
    }
  };
}
