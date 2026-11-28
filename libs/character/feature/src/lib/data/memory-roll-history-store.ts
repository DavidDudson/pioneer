import type { CharacterId } from '@pioneer/character/domain';

import type { KeptRoll, RollHistoryEntry, RollHistoryStore } from './roll-history-entry';

/** Rolls that last as long as the page: where IndexedDB is missing, and in tests. */
export class MemoryRollHistoryStore implements RollHistoryStore {
  readonly #rolls = new Map<number, RollHistoryEntry>();
  #next = 1;

  public readonly list = async (character: CharacterId): Promise<ReadonlyArray<KeptRoll>> =>
    [...this.#rolls]
      .flatMap(([key, entry]) => (entry.character === character ? [{ key, entry }] : []))
      .toSorted((left, right) => right.key - left.key);

  public readonly append = async (entry: RollHistoryEntry, cap: number): Promise<number> => {
    const key = this.#next;
    this.#next += 1;
    this.#rolls.set(key, entry);

    const own = [...this.#rolls].filter(([, kept]) => kept.character === entry.character);

    for (const [oldKey] of own.slice(0, Math.max(0, own.length - cap))) {
      this.#rolls.delete(oldKey);
    }

    return key;
  };

  public readonly replace = async (key: number, entry: RollHistoryEntry): Promise<void> => {
    if (this.#rolls.has(key)) {
      this.#rolls.set(key, entry);
    }
  };

  public readonly clear = async (character: CharacterId): Promise<void> => {
    for (const [key, entry] of this.#rolls) {
      if (entry.character === character) {
        this.#rolls.delete(key);
      }
    }
  };
}
