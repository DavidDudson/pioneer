import type { CharacterId } from '@pioneer/character/domain';
import * as z from 'zod';

import { RollHistoryEntry } from './roll-history-entry';
import type { KeptRoll, RollHistoryStore } from './roll-history-entry';

const DATABASE = 'pioneer-rolls';
const DATABASE_VERSION = 1;
const ROLLS = 'rolls';
const BY_CHARACTER = 'character';
const IdbKey = z.number();

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

/** Rolls in IndexedDB, one record per roll under a growing key and indexed by character, so they outlive the page. */
export class IndexedDbRollHistoryStore implements RollHistoryStore {
  readonly #factory: IDBFactory;
  #database: Promise<IDBDatabase> | undefined;

  public constructor(factory: IDBFactory) {
    this.#factory = factory;
  }

  public readonly list = async (character: CharacterId): Promise<ReadonlyArray<KeptRoll>> => {
    const store = await this.#store('readonly');
    const index = store.index(BY_CHARACTER);
    // Both answer in key order within one character, so a value and its key sit at one position.
    const [keys, values] = await Promise.all([settled(index.getAllKeys(character)), settled(index.getAll(character))]);

    return values
      .flatMap((value, position) => {
        const entry = RollHistoryEntry.safeParse(value);
        const key = IdbKey.safeParse(keys[position]);

        return entry.success && key.success ? [{ key: key.data, entry: entry.data }] : [];
      })
      .toReversed();
  };

  public readonly append = async (entry: RollHistoryEntry, cap: number): Promise<number> => {
    const store = await this.#store('readwrite');
    const added = await settled(store.add(entry));
    const keys = await this.#keys(store, entry.character);

    for (const old of keys.slice(0, Math.max(0, keys.length - cap))) {
      store.delete(old);
    }

    await committed(store.transaction);

    return Number(added);
  };

  public readonly replace = async (key: number, entry: RollHistoryEntry): Promise<void> => {
    const store = await this.#store('readwrite');
    const present = await settled(store.count(key));

    if (present > 0) {
      store.put(entry, key);
    }

    await committed(store.transaction);
  };

  public readonly clear = async (character: CharacterId): Promise<void> => {
    const store = await this.#store('readwrite');

    for (const key of await this.#keys(store, character)) {
      store.delete(key);
    }

    await committed(store.transaction);
  };

  /** The keys of the character's rolls, oldest first. */
  // oxlint-disable-next-line class-methods-use-this -- reads the store it is given, so it needs no state
  async #keys(store: IDBObjectStore, character: CharacterId): Promise<ReadonlyArray<number>> {
    const keys = await settled(store.index(BY_CHARACTER).getAllKeys(character));

    return keys
      .flatMap((key) => {
        const parsed = IdbKey.safeParse(key);

        return parsed.success ? [parsed.data] : [];
      })
      .toSorted((left, right) => left - right);
  }

  async #store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    const database = await this.#open();

    return database.transaction(ROLLS, mode).objectStore(ROLLS);
  }

  async #open(): Promise<IDBDatabase> {
    this.#database ??= this.#upgradeAndOpen();

    return this.#database;
  }

  async #upgradeAndOpen(): Promise<IDBDatabase> {
    const request = this.#factory.open(DATABASE, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      const store = request.result.createObjectStore(ROLLS, { autoIncrement: true });
      store.createIndex(BY_CHARACTER, BY_CHARACTER);
    });

    try {
      const database = await settled(request);
      database.addEventListener('versionchange', () => {
        database.close();
        this.#database = undefined;
      });

      return database;
    } catch (error) {
      this.#database = undefined;
      throw error;
    }
  }
}
