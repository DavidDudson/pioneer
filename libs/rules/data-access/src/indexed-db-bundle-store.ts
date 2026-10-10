import type { BundleStore, StoredKey } from './bundle-store';

const DATABASE = 'pioneer-content';
const DATABASE_VERSION = 1;
const BUNDLES = 'bundles';

/** A request's result, or its error. */
async function settled<TResult>(request: IDBRequest<TResult>): Promise<TResult> {
  // oxlint-disable-next-line promise/avoid-new -- IndexedDB reports through events; this is where they become a promise
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB request failed'));
    });
  });
}

/**
 * The database `request` opens. Blocked by an older version open in another tab, it fails rather than waits, so the
 * cache fetches instead of hanging.
 */
async function opened(request: IDBOpenDBRequest): Promise<IDBDatabase> {
  // oxlint-disable-next-line promise/avoid-new -- IndexedDB reports through events; this is where they become a promise
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => {
      resolve(request.result);
    });
    request.addEventListener('error', () => {
      reject(request.error ?? new Error('IndexedDB open failed'));
    });
    request.addEventListener('blocked', () => {
      reject(new Error('IndexedDB open blocked by another tab'));
    });
  });
}

/** Resolves when `transaction` commits. */
async function committed(transaction: IDBTransaction): Promise<void> {
  // oxlint-disable-next-line promise/avoid-new -- IndexedDB reports through events; this is where they become a promise
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => {
      resolve();
    });
    transaction.addEventListener('error', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction failed'));
    });
    transaction.addEventListener('abort', () => {
      reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
    });
  });
}

/** Bundles in IndexedDB, keyed by path: they outlive the page, so a later visit and offline use need no requests. */
export class IndexedDbBundleStore implements BundleStore {
  readonly #factory: IDBFactory;
  #database: Promise<IDBDatabase> | undefined;

  public constructor(factory: IDBFactory) {
    this.#factory = factory;
  }

  public readonly read = async (key: StoredKey): Promise<unknown> => {
    const store = await this.#store('readonly');
    return settled<unknown>(store.get(key));
  };

  public readonly write = async (key: StoredKey, body: unknown): Promise<void> => {
    const store = await this.#store('readwrite');
    store.put(body, key);
    await committed(store.transaction);
  };

  public readonly keys = async (): Promise<readonly StoredKey[]> => {
    const store = await this.#store('readonly');
    const keys = await settled(store.getAllKeys());
    return keys.filter((key): key is StoredKey => typeof key === 'string');
  };

  public readonly remove = async (keys: readonly StoredKey[]): Promise<void> => {
    const store = await this.#store('readwrite');
    for (const key of keys) {
      store.delete(key);
    }
    await committed(store.transaction);
  };

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const database = await this.#open();
    return database.transaction(BUNDLES, mode).objectStore(BUNDLES);
  }

  async #open(): Promise<IDBDatabase> {
    this.#database ??= this.#upgradeAndOpen();
    return this.#database;
  }

  async #upgradeAndOpen(): Promise<IDBDatabase> {
    const request = this.#factory.open(DATABASE, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      request.result.createObjectStore(BUNDLES);
    });
    try {
      const database = await opened(request);
      // A newer version open in another tab waits on this connection: let it go, and open again on the next use.
      database.addEventListener('versionchange', () => {
        database.close();
        this.#database = undefined;
      });
      return database;
    } catch (error) {
      // Opening again may work (another tab released a lock), so a failure is not kept.
      this.#database = undefined;
      throw error;
    }
  }
}
