import { InjectionToken } from '@angular/core';

import { IndexedDbRollHistoryStore } from './indexed-db-roll-history-store';
import { MemoryRollHistoryStore } from './memory-roll-history-store';
import type { RollHistoryStore } from './roll-history-entry';

/** Where rolls are kept: IndexedDB when the browser has it, else memory for the page's life. */
export const ROLL_HISTORY_STORE = new InjectionToken<RollHistoryStore>('ROLL_HISTORY_STORE', {
  providedIn: 'root',
  factory: (): RollHistoryStore => {
    try {
      return 'indexedDB' in globalThis
        ? new IndexedDbRollHistoryStore(globalThis.indexedDB)
        : new MemoryRollHistoryStore();
    } catch {
      // Storage blocked (a sandboxed frame): the history lasts the page, and the sheet still builds.
      return new MemoryRollHistoryStore();
    }
  },
});
